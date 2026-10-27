/* eslint-disable */
/**
 * Universal Editor instrumentation check (local, no editor needed).
 *
 * Simulates what the Author Bus backend (*.ue.da.live) adds to the delivered HTML, using the
 * built component-definition.json / component-models.json:
 *   - every block: data-aue-resource, data-aue-type="container"|"component", data-aue-component,
 *     data-aue-model, data-aue-label (+ data-aue-filter for container blocks)
 *   - container blocks: every row is an item (data-aue-resource ...-item-N, data-aue-component)
 *   - fields: the element matched by each `plugins.da.fields[].selector` (relative to the block,
 *     or to the item row) gets data-aue-prop=<name> and data-aue-type text|richtext|media
 *   - key-value blocks: the value cell of each row gets data-aue-prop=<key>
 * then lets the page decorate as usual and reports instrumentation that was lost (no element
 * carries it any more) or that sits on an element with no box (invisible in the editor).
 *
 * Usage (local preview running on :3000):
 *   node test/ue/check-instrumentation.cjs [--block <name>] <path> [<path> ...]
 *   e.g. node test/ue/check-instrumentation.cjs /au/en/our-impact/sustainability
 * Exit code 1 when anything is lost.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const PW = process.env.PLAYWRIGHT_MODULE
  || '/home/node/.excat-marketplaces/excat-marketplace/excat/skills/excat-catalog-pages/scripts/node_modules/playwright';
const { chromium } = require(PW);
const ORIGIN = process.env.LOCAL_ORIGIN || 'http://localhost:3000';

const defs = JSON.parse(fs.readFileSync(path.join(ROOT, 'component-definition.json'), 'utf8'))
  .groups.flatMap((g) => g.components);
const models = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, 'component-models.json'), 'utf8'))
  .map((m) => [m.id, m]));
const filters = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, 'component-filters.json'), 'utf8'))
  .map((f) => [f.id, f.components]));

const args = process.argv.slice(2);
const onlyBlock = args.includes('--block') ? args[args.indexOf('--block') + 1] : null;
const paths = args.filter((a, i) => a.startsWith('/') && args[i - 1] !== '--block');
// --ue-host: load the page as https://main--ww-eds-ew--cscrewvala.ue.da.live (mapped to the local
// preview) so the editor code path runs (scripts.js editor mode + ue/scripts/ue.js inline guard).
// Then every field still bound on the canvas must hold exactly its authored content (that is what
// an inline save writes); fields the guard moved to the properties panel are reported, not failed.
const ueHost = args.includes('--ue-host');
const UE_HOST = 'https://main--ww-eds-ew--cscrewvala.ue.da.live';

const typeOf = (component) => (component === 'reference' ? 'media' : component === 'richtext' ? 'richtext' : 'text');

/** runs in the page before scripts: instruments the raw block markup */
function instrument({ defs: allDefs, models: allModels, filters: allFilters, onlyBlock: only }) {
  const byName = {};
  allDefs.forEach((d) => { const n = (d.plugins && d.plugins.da && d.plugins.da.name) || d.id; byName[n] = byName[n] || d; byName[d.id] = byName[d.id] || d; });
  const typeOfF = (c) => (c === 'reference' ? 'media' : c === 'richtext' ? 'richtext' : 'text');
  const expected = [];
  let n = 0;
  const strip = (sel) => sel.replace(/\[(src|alt|href|title)\]$/, '');
  const applyFields = (root, def, resource) => {
    const model = allModels[def.model] || { fields: [] };
    const fields = (def.plugins && def.plugins.da && def.plugins.da.fields) || [];
    fields.forEach((f) => {
      const mf = model.fields.find((x) => x.name === f.name);
      if (!mf || /\[alt\]$/.test(f.selector)) return; // alt edits the same <img> as the image field
      let el = null;
      // structural selectors (div:nth-child…, div>div…) address rows/cells from the block or row;
      // only element selectors (e.g. picture>img) may match anywhere inside it
      const sel = strip(f.selector);
      try { el = root.querySelector(`:scope > ${sel}`) || (/^div\b/.test(sel) ? null : root.querySelector(sel)); } catch (e) { expected.push({ resource, prop: f.name, error: `bad selector ${f.selector}` }); return; }
      if (!el) return; // optional field not present in this instance
      if (el.hasAttribute('data-aue-prop')) return;
      el.setAttribute('data-aue-prop', f.name);
      el.setAttribute('data-aue-type', typeOfF(mf.component));
      el.setAttribute('data-aue-label', mf.label || f.name);
      expected.push({ resource, prop: f.name, kind: 'prop', ptype: typeOfF(mf.component), html: el.innerHTML, text: el.textContent });
    });
  };
  document.querySelectorAll('main > div > div[class]').forEach((block) => {
    const name = block.classList[0];
    // section-metadata / metadata are edited through the section and page models
    if (name === 'section-metadata' || name === 'metadata') return;
    if (only && name !== only) return;
    const def = byName[name];
    if (!def) { expected.push({ block: name, missingDefinition: true }); return; }
    n += 1;
    const resource = `urn:ab:test/block-${n}`;
    const isContainer = !!def.filter;
    block.setAttribute('data-aue-resource', resource);
    block.setAttribute('data-aue-type', isContainer ? 'container' : 'component');
    block.setAttribute('data-aue-component', def.id);
    block.setAttribute('data-aue-model', def.model || def.id);
    block.setAttribute('data-aue-label', def.title);
    if (isContainer) block.setAttribute('data-aue-filter', def.filter);
    expected.push({ resource, kind: 'block', block: name });
    const da = (def.plugins && def.plugins.da) || {};
    if (da.type === 'key-value-block') {
      const model = allModels[def.model] || { fields: [] };
      [...block.children].forEach((row) => {
        const key = (row.children[0] && row.children[0].textContent.trim().toLowerCase()) || '';
        const mf = model.fields.find((f) => f.name.toLowerCase() === key || (f.label || '').toLowerCase() === key);
        if (mf && row.children[1]) {
          row.children[1].setAttribute('data-aue-prop', mf.name);
          row.children[1].setAttribute('data-aue-type', typeOfF(mf.component));
          expected.push({ resource, prop: mf.name, kind: 'prop' });
        }
      });
    } else if (isContainer) {
      const itemIds = allFilters[def.filter] || [];
      const blockFieldCount = (da.fields || []).length;
      applyFields(block, def, resource);
      [...block.children].forEach((row, i) => {
        // rows already instrumented as block-level fields stay block fields
        if (row.hasAttribute('data-aue-prop') || row.querySelector(':scope > [data-aue-prop]') && blockFieldCount) return;
        const itemDef = itemIds.map((id) => allDefs.find((d) => d.id === id)).find(Boolean);
        if (!itemDef) return;
        const r = `${resource}/item-${i}`;
        row.setAttribute('data-aue-resource', r);
        row.setAttribute('data-aue-type', 'component');
        row.setAttribute('data-aue-component', itemDef.id);
        row.setAttribute('data-aue-model', itemDef.model || itemDef.id);
        row.setAttribute('data-aue-label', itemDef.title);
        expected.push({ resource: r, kind: 'item', block: name });
        applyFields(row, itemDef, r);
      });
    } else {
      applyFields(block, def, resource);
    }
  });
  window.__ueExpected = expected;
}

(async () => {
  const browser = await chromium.launch();
  let failed = 0;
  for (const p of paths) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const localUrl = `${ORIGIN}/content${p === '/' ? '/index' : p}`;
    const url = ueHost ? `${UE_HOST}${p}` : localUrl;
    const LIVERELOAD = new RegExp('<script[^>]*livereload[^>]*></script>', 'g');
    await page.route(/livereload/, (route) => route.abort());
    if (ueHost) {
      // code and other requests on the editor host come from the local preview
      await page.route(`${UE_HOST}/**`, async (route) => {
        const u = new URL(route.request().url());
        if (u.href === url) return route.fallback();
        const res = await route.fetch({ url: `${ORIGIN}${u.pathname}${u.search}` });
        return route.fulfill({ response: res });
      });
    }
    // instrument the server HTML before any page script runs
    await page.route(url, async (route) => {
      const res = await route.fetch({ url: localUrl });
      const html = (await res.text()).replace(LIVERELOAD, '');
      const inject = `<script nonce="aem">(${instrument.toString()})(${JSON.stringify({ defs, models, filters, onlyBlock })});</script>`;
      // run after the body is parsed but before the module scripts execute (they are deferred)
      await route.fulfill({ response: res, body: html.replace('</body>', `${inject}</body>`), headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    // scroll through the page so lazy-loaded images get a size before visibility is measured
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1500);
    const report = await page.evaluate(() => {
      const exp = window.__ueExpected || [];
      const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      return exp.map((e) => {
        if (e.missingDefinition || e.error) return { ...e, ok: false };
        const sel = e.kind === 'prop'
          ? `[data-aue-resource="${e.resource}"] [data-aue-prop="${e.prop}"], [data-aue-resource="${e.resource}"][data-aue-prop="${e.prop}"]`
          : `[data-aue-resource="${e.resource}"]`;
        let els = [...document.querySelectorAll(sel)];
        if (e.kind === 'prop' && !els.length) {
          // props of an item whose element moved inside a re-parented container
          els = [...document.querySelectorAll(`[data-aue-prop="${e.prop}"]`)].filter((x) => x.closest(`[data-aue-resource="${e.resource}"]`) || false);
        }
        const el = els[0];
        const norm = (x) => (x || '').replace(/\s+/g, ' ').replace(/> </g, '><').trim();
        const inlineSame = !el || e.kind !== 'prop' || e.ptype === 'media'
          || (e.ptype === 'richtext' ? norm(el.innerHTML) === norm(e.html) : norm(el.textContent) === norm(e.text));
        return { ...e, ok: !!el, visible: el ? visible(el) : false, tag: el ? el.tagName.toLowerCase() : null, inlineSame,
          ueMode: document.documentElement.dataset.ue === 'true', got: el && !inlineSame ? norm(el.innerHTML).slice(0, 200) : undefined, html: undefined, text: undefined };
      });
    });
    const byBlock = {};
    report.forEach((r) => { const b = r.block || (r.resource || '').split('/')[1]; (byBlock[b] = byBlock[b] || []).push(r); });
    if (ueHost) {
      const comps = report.filter((r) => r.kind !== 'prop');
      const props = report.filter((r) => r.kind === 'prop');
      const unsafe = props.filter((r) => r.ok && !r.inlineSame);
      const lostComps = comps.filter((r) => !r.ok);
      const inline = props.filter((r) => r.ok).length;
      const notUe = report.length && !report[0].ueMode;
      console.log(`\n${p}: ${comps.length} blocks/items (${lostComps.length} lost), fields ${props.length}: ${inline} inline, ${props.length - inline} panel-only, ${unsafe.length} UNSAFE inline${notUe ? ' (editor mode NOT active!)' : ''}${errors.length ? `, page errors: ${errors.join(' | ')}` : ''}`);
      lostComps.forEach((r) => console.log('  LOST   ', r.missingDefinition ? `no definition for block "${r.block}"` : r.error || `${r.kind} ${r.resource}`));
      unsafe.forEach((r) => console.log('  UNSAFE ', `${r.resource} prop=${r.prop} (${r.tag}): ${r.got}`));
      failed += lostComps.length + unsafe.length + (notUe ? 1 : 0) + (errors.length ? 1 : 0);
      await page.close();
      continue;
    }
    const lost = report.filter((r) => !r.ok);
    const hidden = report.filter((r) => r.ok && !r.visible && r.kind !== 'prop');
    console.log(`\n${p}: ${report.length} instrumented, ${lost.length} lost, ${hidden.length} on invisible elements${errors.length ? `, page errors: ${errors.join(' | ')}` : ''}`);
    lost.forEach((r) => console.log('  LOST   ', r.missingDefinition ? `no definition for block "${r.block}"` : r.error || `${r.kind} ${r.resource}${r.prop ? ` prop=${r.prop}` : ''}`));
    hidden.forEach((r) => console.log('  HIDDEN ', `${r.kind} ${r.resource} (${r.tag})`));
    failed += lost.length + (errors.length ? 1 : 0);
    await page.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
