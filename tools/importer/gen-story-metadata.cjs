#!/usr/bin/env node
/* eslint-disable */
/**
 * Extends transformers/article-metadata-data.js with story entries read from the source
 * "Our Stories" listing tiles (filterTag component): tags from data-filter-value, image from
 * the tile image (Dynamic Media URL without query), keyed by source path without .html.
 * Stories missing from the listings are then looked up in the related-story tiles of the
 * story pages themselves (urls-story-article.txt, urls-story-banner.txt).
 * Existing entries are kept as-is; only missing story paths are added.
 *
 * Usage: PLAYWRIGHT_BROWSERS_PATH=/ms-playwright node tools/importer/gen-story-metadata.cjs [playwright-module-path]
 */
const fs = require('fs');
const path = require('path');

const PW = process.argv[2]
  || '/home/node/.excat-marketplaces/excat-marketplace/excat/skills/excat-catalog-pages/scripts/node_modules/playwright';
const { chromium } = require(PW);

const ORIGIN = 'https://www.woolworthsgroup.com.au';
const LISTINGS = [
  '/au/en/our-impact/sustainability/our-stories.html',
  '/au/en/who-we-are/100-years-of-wwg.html',
];
const DATA_FILE = path.join(__dirname, 'transformers', 'article-metadata-data.js');
const SCAN_FILES = ['urls-story-article.txt', 'urls-story-banner.txt'].map((f) => path.join(__dirname, f));

// Tile reader (runs in the page): [{ href, tags, image }]
function readTiles() {
  return [...document.querySelectorAll('.contenttile.teaser')].map((tile) => {
    const md = tile.querySelector('.contenttile--md') || tile.querySelector('.cmp-teaser') || tile;
    const a = md.querySelector('a[href]');
    let href = a ? a.getAttribute('href') : '';
    if (!href) {
      const layer = tile.querySelector('[data-cmp-data-layer]');
      const m = layer && (layer.getAttribute('data-cmp-data-layer') || '').match(/"xdm:linkURL"\s*:\s*"([^"]+)"/);
      href = m ? m[1] : '';
    }
    const holder = md.matches('[data-filter-value]') ? md : md.querySelector('[data-filter-value]');
    const fv = holder ? holder.getAttribute('data-filter-value') : '';
    const img = md.querySelector('img.cmp-image__image, img');
    const dm = md.querySelector('[data-cmp-src]');
    const image = (img && img.getAttribute('src') && !img.getAttribute('src').startsWith('data:'))
      ? img.getAttribute('src') : (dm ? dm.getAttribute('data-cmp-src') : '');
    return { href, tags: fv || '', image };
  });
}

function loadExisting() {
  const src = fs.readFileSync(DATA_FILE, 'utf8');
  const json = src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1);
  return JSON.parse(json);
}

(async () => {
  const data = loadExisting();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const found = {};
  for (const listing of LISTINGS) {
    await page.goto(`${ORIGIN}${listing}`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
    const tiles = await page.evaluate(readTiles);
    addTiles(found, tiles);
  }

  // Related-story tiles on the story pages fill in stories missing from the listings.
  const scanUrls = SCAN_FILES.filter((f) => fs.existsSync(f))
    .flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean));
  const related = {};
  const queue = [...new Set(scanUrls)];
  const worker = async () => {
    const p = await browser.newPage();
    while (queue.length) {
      const url = queue.shift();
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
      await p.waitForTimeout(1000);
      addTiles(related, await p.evaluate(readTiles).catch(() => []));
    }
    await p.close();
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  Object.entries(related).forEach(([p, v]) => { if (!found[p]) found[p] = v; });
  await browser.close();
  writeOut(data, found);
})();

function addTiles(found, tiles) {
    tiles.forEach((t) => {
      if (!t.href) return;
      let p;
      try { p = new URL(t.href, 'https://www.woolworthsgroup.com.au').pathname; } catch (e) { return; }
      p = p.replace(/^\/content\/wwg\/+/, '/').replace(/\.html?$/, '');
      if (!/\/our-stories\/\d{4}\//.test(p)) return;
      const tags = t.tags.split(',').map((s) => s.trim()).filter((s) => s && !/^all( stories)?$/i.test(s));
      const image = (t.image || '').split('?')[0];
      const prev = found[p];
      found[p] = {
        date: '',
        tags: [...new Set([...(prev ? prev.tags : []), ...tags])],
        image: (prev && prev.image) || (image ? new URL(image, 'https://www.woolworthsgroup.com.au').href : ''),
      };
    });
}

function writeOut(data, found) {
  const lc = new Set(Object.keys(data).map((k) => k.toLowerCase()));
  let added = 0;
  Object.entries(found).forEach(([p, v]) => {
    if (lc.has(p.toLowerCase())) return;
    data[p] = v;
    lc.add(p.toLowerCase());
    added += 1;
  });
  const out = `/* Generated from the source site dynamic listing feeds (newsArticlesDynamic, latestNewsDynamic,
 * filterTag story tiles). Keyed by source path without .html. Do not edit by hand.
 * Story entries extended by tools/importer/gen-story-metadata.cjs. */
const ARTICLE_METADATA = ${JSON.stringify(data, null, 1)};

export default ARTICLE_METADATA;
`;
  fs.writeFileSync(DATA_FILE, out);
  console.log(`story tiles: ${Object.keys(found).length}, added: ${added}, total: ${Object.keys(data).length}`);
}
