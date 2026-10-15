/* Compare decorated rendering of every published page: local preview vs aem.live.
 * Usage: PLAYWRIGHT_BROWSERS_PATH=/ms-playwright node docs/migration/compare-local-live.cjs [--paths=a,b] [--width=1440]
 * Writes /tmp/local-live-report.json and prints a summary of differing blocks.
 */
const fs = require('fs');
const { chromium } = require('/home/node/.excat-marketplaces/excat-marketplace/excat/skills/excat-catalog-pages/scripts/node_modules/playwright');

const LOCAL = 'http://localhost:3000/content';
const LIVE = 'https://main--ww-eds-ew--cscrewvala.aem.live';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const width = Number(args.width || 1440);
const manifest = JSON.parse(fs.readFileSync('/tmp/da-upload/manifest.json', 'utf8'));
const paths = args.paths ? args.paths.split(',') : manifest.docs
  .filter((p) => !['nav', 'footer'].includes(p) && !p.endsWith('nav-section'))
  .map((p) => (p === 'index' ? '/' : `/${p}`));

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

async function snapshot(page, url) {
  const errors = [];
  const onErr = (e) => errors.push(String(e.message || e).slice(0, 160));
  const onConsole = (m) => { if (m.type() === 'error' && !/Failed to load resource|frame-ancestors/.test(m.text())) errors.push(m.text().slice(0, 160)); };
  page.on('pageerror', onErr);
  page.on('console', onConsole);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  for (let y = 0; y < 12; y += 1) { await page.mouse.wheel(0, 1500); await page.waitForTimeout(60); }
  await page.waitForTimeout(1200);
  const data = await page.evaluate(() => {
    const n = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const blocks = [...document.querySelectorAll('main div[data-block-name]')].map((b) => ({
      name: b.dataset.blockName,
      status: b.dataset.blockStatus,
      cls: [...b.classList].filter((c) => !['block'].includes(c)).sort().join(' '),
      text: n(b.innerText).slice(0, 4000),
      imgs: b.querySelectorAll('img').length,
      links: b.querySelectorAll('a[href]').length,
      buttons: b.querySelectorAll('button').length,
      h: [...b.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => h.tagName).join(''),
      height: Math.round(b.getBoundingClientRect().height),
    }));
    const sections = [...document.querySelectorAll('main > .section')].map((s) => [...s.classList].filter((c) => !c.endsWith('-container')).sort().join(' '));
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    return {
      title: document.title,
      sections,
      defaultText: n([...document.querySelectorAll('main .default-content-wrapper')].map((d) => d.innerText).join(' ')).slice(0, 6000),
      blocks,
      header: header ? { text: n(header.innerText).slice(0, 3000), groups: header.querySelectorAll('.nav-mega-group-title').length, links: header.querySelectorAll('a[href]').length } : null,
      footer: footer ? { text: n(footer.innerText).slice(0, 3000), links: footer.querySelectorAll('a[href]').length, imgs: footer.querySelectorAll('img').length } : null,
      sideNav: document.querySelector('.side-nav') ? n(document.querySelector('.side-nav').innerText).slice(0, 1000) : null,
      h1: document.querySelectorAll('h1').length,
    };
  });
  page.off('pageerror', onErr);
  page.off('console', onConsole);
  return { ...data, errors: [...new Set(errors)] };
}

function diff(path, a, b) {
  const out = [];
  if (a.errors.length || b.errors.length) out.push({ kind: 'errors', local: a.errors, live: b.errors });
  if (a.sections.join('|') !== b.sections.join('|')) out.push({ kind: 'sections', local: a.sections, live: b.sections });
  if (a.blocks.length !== b.blocks.length) out.push({ kind: 'block-count', local: a.blocks.map((x) => x.name), live: b.blocks.map((x) => x.name) });
  a.blocks.forEach((x, i) => {
    const y = b.blocks[i];
    if (!y) return;
    const fields = ['name', 'status', 'cls', 'imgs', 'links', 'buttons', 'h'].filter((f) => x[f] !== y[f]);
    if (x.text !== y.text) fields.push('text');
    if (Math.abs(x.height - y.height) > Math.max(24, x.height * 0.08)) fields.push('height');
    if (fields.length) {
      out.push({
        kind: 'block', block: x.name, index: i, fields,
        local: Object.fromEntries(fields.map((f) => [f, f === 'text' ? x.text.slice(0, 300) : x[f]])),
        live: Object.fromEntries(fields.map((f) => [f, f === 'text' ? y.text.slice(0, 300) : y[f]])),
      });
    }
  });
  if (norm(a.defaultText) !== norm(b.defaultText)) out.push({ kind: 'default-content', local: a.defaultText.slice(0, 300), live: b.defaultText.slice(0, 300) });
  ['header', 'footer'].forEach((k) => {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push({ kind: k, local: a[k], live: b[k] });
  });
  if (a.sideNav !== b.sideNav) out.push({ kind: 'side-nav', local: a.sideNav, live: b.sideNav });
  if (a.h1 !== b.h1) out.push({ kind: 'h1-count', local: a.h1, live: b.h1 });
  return { path, diffs: out };
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const local = await ctx.newPage();
  const live = await ctx.newPage();
  const report = [];
  for (const p of paths) {
    try {
      const [a, b] = await Promise.all([snapshot(local, LOCAL + (p === '/' ? '/index' : p)), snapshot(live, LIVE + p)]);
      report.push(diff(p, a, b));
    } catch (e) {
      report.push({ path: p, diffs: [{ kind: 'crash', message: e.message.slice(0, 200) }] });
    }
  }
  await browser.close();
  fs.writeFileSync('/tmp/local-live-report.json', JSON.stringify(report, null, 1));
  const bad = report.filter((r) => r.diffs.length);
  const byKind = {};
  bad.forEach((r) => r.diffs.forEach((d) => {
    const k = d.kind === 'block' ? `block:${d.block}:${d.fields.join('+')}` : d.kind;
    byKind[k] = (byKind[k] || 0) + 1;
  }));
  console.log(`${paths.length} pages @${width}px — ${bad.length} with differences`);
  Object.entries(byKind).sort((x, y) => y[1] - x[1]).forEach(([k, v]) => console.log(`${String(v).padStart(4)}  ${k}`));
})();
