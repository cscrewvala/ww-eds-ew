/* eslint-disable */
/**
 * Universal Editor save round-trip check (local, no editor needed).
 *
 * When any field of a block is saved, the Author Bus backend rebuilds the whole block from the
 * definition's fields: every field writes its value at its selector path; content no field
 * covers is dropped. This simulates that for every block on the given pages:
 *   1. read each field value from the source block (selector relative to the block, or to the
 *      row for container items; richtext = innerHTML, text = textContent, [attr] = attribute)
 *   2. rebuild the block from those values only (block classes from the `classes` field)
 *   3. report: content lost (source vs rebuilt markup), classes not in the options, and whether
 *      the DECORATED page changes when the rebuilt block replaces the original.
 * Columns-behaviour blocks and blocks without a definition are left as they are (not simulated).
 *
 * Usage (local preview on :3000): node test/ue/check-roundtrip.cjs [--block <name>] <path> [<path> ...]
 *        node test/ue/check-roundtrip.cjs --all     (every page under content/)
 * Exit code 1 on any loss or rendering change.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const PW = process.env.PLAYWRIGHT_MODULE
  || '/home/node/.excat-marketplaces/excat-marketplace/excat/skills/excat-catalog-pages/scripts/node_modules/playwright';
const { chromium } = require(PW);
const ORIGIN = process.env.LOCAL_ORIGIN || 'http://localhost:3000';

const defs = JSON.parse(fs.readFileSync(path.join(ROOT, 'component-definition.json'), 'utf8')).groups.flatMap((g) => g.components);
const models = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, 'component-models.json'), 'utf8')).map((m) => [m.id, m]));
const filters = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, 'component-filters.json'), 'utf8')).map((f) => [f.id, f.components]));

const args = process.argv.slice(2);
const onlyBlock = args.includes('--block') ? args[args.indexOf('--block') + 1] : null;
let paths = args.filter((a, i) => a.startsWith('/') && args[i - 1] !== '--block');
if (args.includes('--all')) {
  const out = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.plain.html')) out.push(p);
  });
  const c = fs.realpathSync(path.join(ROOT, 'content'));
  walk(c);
  paths = out.map((p) => p.slice(c.length).replace(/\.plain\.html$/, '').replace(/^\/index$/, '/'))
    .filter((p) => !/\/(nav|footer|nav-section)$/.test(p)).sort();
}

/** runs in the browser: rebuilds blocks of a parsed document; returns { html, report } */
function rebuild({ html, defs: allDefs, models: allModels, filters: allFilters, only }) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const byName = {};
  allDefs.forEach((d) => { const n = (d.plugins && d.plugins.da && d.plugins.da.name) || d.id; if (!byName[n]) byName[n] = d; });
  const norm = (s) => s.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
  const steps = (sel) => sel.split('>').map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = s.match(/^([a-z0-9]+)(?::nth-child\((\d+)\))?(?:\[([a-z-]+)\])?$/i);
    return m ? { tag: m[1].toLowerCase(), nth: m[2] ? Number(m[2]) : null, attr: m[3] || null } : { bad: s };
  });
  const read = (root, sel, component) => {
    const st = steps(sel);
    if (st.some((s) => s.bad)) return { error: `unsupported selector "${sel}"` };
    let el = root;
    for (const s of st) {
      const kids = [...el.children];
      el = s.nth ? kids[s.nth - 1] : kids.find((k) => k.tagName.toLowerCase() === s.tag);
      if (!el || el.tagName.toLowerCase() !== s.tag) return { value: null };
    }
    const last = st[st.length - 1];
    if (last.attr) return { value: el.getAttribute(last.attr) };
    return { value: component === 'richtext' ? el.innerHTML : el.textContent };
  };
  const write = (root, sel, component, value) => {
    const st = steps(sel);
    let el = root;
    st.forEach((s) => {
      const kids = [...el.children];
      let next = s.nth ? kids[s.nth - 1] : kids.find((k) => k.tagName.toLowerCase() === s.tag);
      if (s.nth) { while (el.children.length < s.nth) el.append(doc.createElement(s.tag)); next = el.children[s.nth - 1]; }
      if (!next) { next = doc.createElement(s.tag); el.append(next); }
      el = next;
    });
    const last = st[st.length - 1];
    if (value == null) return;
    if (last.attr) el.setAttribute(last.attr, value);
    else if (component === 'richtext') el.innerHTML = value;
    else el.textContent = value;
  };
  const fieldComponent = (model, name) => ((model && model.fields.find((x) => x.name === name)) || {}).component || 'text';
  const report = [];
  doc.querySelectorAll('main > div > div[class]').forEach((block, bi) => {
    const name = block.classList[0];
    if (['metadata', 'section-metadata'].includes(name)) return;
    if (only && name !== only) return;
    const def = byName[name];
    const da = (def && def.plugins && def.plugins.da) || {};
    if (!def || da.behaviour) { report.push({ block: name, index: bi, skipped: def ? 'columns behaviour' : 'no definition' }); return; }
    const rebuilt = doc.createElement('div');
    const model = allModels[def.model];
    const classField = model && model.fields.find((x) => x.name === 'classes');
    const opts = classField ? classField.options.map((o) => o.value) : [];
    const variants = [...block.classList].slice(1);
    const lostClasses = variants.filter((v) => !opts.includes(v));
    rebuilt.className = [name, ...variants.filter((v) => opts.includes(v))].join(' ');
    const errors = [];
    if (da.type === 'key-value-block') {
      [...block.children].forEach((row) => {
        const key = (row.children[0] && row.children[0].textContent.trim()) || '';
        const mf = model.fields.find((x) => x.name.toLowerCase() === key.toLowerCase() || (x.label || '').toLowerCase() === key.toLowerCase());
        if (!mf) { errors.push(`row "${key}" has no field`); return; }
        const r = doc.createElement('div');
        const k = doc.createElement('div'); k.textContent = key;
        const v = doc.createElement('div');
        if (mf.component === 'richtext') v.innerHTML = row.children[1] ? row.children[1].innerHTML : ''; else v.textContent = row.children[1] ? row.children[1].textContent : '';
        r.append(k, v); rebuilt.append(r);
      });
    } else if (def.filter) {
      const itemDef = (allFilters[def.filter] || []).map((id) => allDefs.find((d) => d.id === id)).find(Boolean);
      const itemModel = itemDef && allModels[itemDef.model];
      const itemFields = (itemDef && itemDef.plugins.da.fields) || [];
      [...block.children].forEach((row) => {
        const r = doc.createElement('div');
        itemFields.forEach((fl) => {
          const comp = fieldComponent(itemModel, fl.name);
          const { value, error } = read(row, fl.selector, comp);
          if (error) errors.push(error);
          write(r, fl.selector, comp, value == null ? '' : value);
        });
        rebuilt.append(r);
      });
    } else {
      (da.fields || []).forEach((fl) => {
        const comp = fieldComponent(model, fl.name);
        const { value, error } = read(block, fl.selector, comp);
        if (error) errors.push(error);
        write(rebuilt, fl.selector, comp, value == null ? '' : value);
      });
    }
    // content loss: every text and every URL of the source must survive
    const texts = (el) => el.textContent.replace(/\s+/g, ' ').trim();
    const urls = (el) => [...el.querySelectorAll('[href],[src]')].map((x) => x.getAttribute('href') || x.getAttribute('src')).sort().join('|');
    const sameText = texts(block) === texts(rebuilt);
    const sameUrls = urls(block) === urls(rebuilt);
    const sameMarkup = norm(block.innerHTML) === norm(rebuilt.innerHTML);
    report.push({ block: name, index: bi, lostClasses, errors, sameText, sameUrls, sameMarkup,
      ...(sameMarkup ? {} : { src: norm(block.outerHTML).slice(0, 400), out: norm(rebuilt.outerHTML).slice(0, 400) }) });
    block.replaceWith(rebuilt);
  });
  return { html: `<!DOCTYPE html>${doc.documentElement.outerHTML}`, report };
}

async function decorated(page, url, body, attempt = 1) {
  await page.unroute('**/*').catch(() => {});
  // serve the page ourselves (original or rebuilt) without the dev server's livereload script,
  // so a file change during a run cannot reload the page mid-measurement
  const LIVERELOAD = new RegExp('<script[^>]*livereload[^>]*></script>', 'g');
  await page.route(url, async (route) => {
    const res = await route.fetch();
    const html = (body || await res.text()).replace(LIVERELOAD, '');
    await route.fulfill({ response: res, body: html, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
  });
  await page.route(/livereload/, (route) => route.abort());
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    return await page.evaluate(() => {
      const m = document.querySelector('main').cloneNode(true);
      m.querySelectorAll('*').forEach((el) => {
        [...el.attributes].forEach((a) => {
          if (/^(id|for|aria-controls|aria-labelledby|aria-describedby|data-aue-|style$|data-slide|data-carousel)/.test(a.name)) el.removeAttribute(a.name);
        });
      });
      // third-party players render asynchronously: compare their containers empty and unclassed
      m.querySelectorAll('video, iframe, .carousel-hero-video, .video-story-player').forEach((v) => { v.replaceChildren(); v.removeAttribute('class'); });
      return m.innerHTML.replace(/\s+/g, ' ');
    });
  } catch (e) {
    if (attempt < 3 && /context was destroyed|navigation|Timeout/i.test(e.message)) return decorated(page, url, body, attempt + 1);
    throw e;
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const totals = { blocks: 0, skipped: 0, lost: 0, classes: 0, markup: 0, render: 0, pages: 0 };
  const problems = [];
  for (const p of paths) {
    const url = `${ORIGIN}/content${p === '/' ? '/index' : p}`;
    const res = await page.request.get(url);
    if (!res.ok()) { problems.push(`${p}: HTTP ${res.status()}`); continue; }
    const html = await res.text();
    const { html: rebuiltHtml, report } = await page.evaluate(rebuild, { html, defs, models, filters, only: onlyBlock });
    totals.pages += 1;
    const simulated = report.filter((r) => !r.skipped);
    totals.blocks += simulated.length;
    totals.skipped += report.length - simulated.length;
    let renderSame = true;
    if (simulated.length) {
      const a = await decorated(page, url, null);
      const b = await decorated(page, url, rebuiltHtml);
      renderSame = a === b;
      if (!renderSame) {
        let i = 0; while (i < a.length && a[i] === b[i]) i += 1;
        problems.push(`${p}: RENDER CHANGES after save  …${a.slice(Math.max(0, i - 120), i + 160)}…\n      rebuilt: …${b.slice(Math.max(0, i - 120), i + 160)}…`);
        totals.render += 1;
      }
    }
    simulated.forEach((r) => {
      const where = `${p} [${r.block} #${r.index}]`;
      if (r.errors.length) problems.push(`${where}: ${r.errors.join('; ')}`);
      if (!r.sameText || !r.sameUrls) { totals.lost += 1; problems.push(`${where}: CONTENT LOST (text ${r.sameText ? 'ok' : 'differs'}, urls ${r.sameUrls ? 'ok' : 'differ'})\n      src: ${r.src}\n      out: ${r.out}`); }
      else if (!r.sameMarkup) { totals.markup += 1; if (!renderSame) problems.push(`${where}: markup differs\n      src: ${r.src}\n      out: ${r.out}`); }
      if (r.lostClasses.length) { totals.classes += 1; problems.push(`${where}: classes not in options: ${r.lostClasses.join(', ')}`); }
    });
  }
  await browser.close();
  problems.forEach((x) => console.log(x));
  console.log(`\npages ${totals.pages}, blocks simulated ${totals.blocks} (not simulated: ${totals.skipped}), content lost ${totals.lost}, classes dropped ${totals.classes}, markup changed ${totals.markup}, pages whose rendering changes ${totals.render}`);
  process.exit(totals.lost || totals.classes || totals.render ? 1 : 0);
})();
