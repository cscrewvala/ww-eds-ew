/* eslint-disable */
/**
 * Adds news entries (date, category tag) to transformers/article-metadata-data.js from a saved
 * newsArticlesDynamic feed dump, keeping existing entries. The live feed is
 *   /content/wwg/au/en/our-newsroom/media-releases/jcr:content/root/container/container/
 *   colscontainer_1047075737/col1-cnt1-0/newsarticles_copy.media.json?offset=0&order=desc&tag=all&year=all&maxitems=12
 * (response.results[]: { url, title, publisheddate "dd/mm/yyyy", tag }).
 *
 * Usage: node tools/importer/gen-news-metadata.cjs <feed.json> [urls.txt]
 *   feed.json: { out: [{ url, date, tag, title }] } (or a raw feed response)
 *   urls.txt:  optional import URL list; only those articles are added
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'transformers', 'article-metadata-data.js');

function loadExisting() {
  const src = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1));
}

function rows(feed) {
  if (Array.isArray(feed.out)) return feed.out;
  const resp = feed.response || feed;
  return (resp.results || []).map((r) => ({ url: r.url, date: r.publisheddate, tag: r.tag, title: r.title }));
}

const isoDate = (d) => {
  const m = (d || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
};

const feed = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const only = process.argv[3]
  ? new Set(fs.readFileSync(process.argv[3], 'utf8').split('\n').map((u) => u.trim()).filter(Boolean)
    .map((u) => new URL(u).pathname.replace(/\.html?$/, '').toLowerCase()))
  : null;
const data = loadExisting();
const lc = new Set(Object.keys(data).map((k) => k.toLowerCase()));
let added = 0;
rows(feed).forEach((r) => {
  const p = (r.url || '').replace(/^\/content\/wwg\/+/, '/').replace(/\.html?$/, '');
  if (!/\/media-releases\/(latest-news|news-archive)\/\d{4}\//.test(p) || lc.has(p.toLowerCase())) return;
  if (only && !only.has(p.toLowerCase())) return;
  data[p] = { date: isoDate(r.date), tags: r.tag ? [r.tag.trim()] : [], image: '' };
  lc.add(p.toLowerCase());
  added += 1;
});

fs.writeFileSync(DATA_FILE, `/* Generated from the source site dynamic listing feeds (newsArticlesDynamic, latestNewsDynamic,
 * filterTag story tiles). Keyed by source path without .html. Do not edit by hand.
 * Story entries extended by tools/importer/gen-story-metadata.cjs, news entries by
 * tools/importer/gen-news-metadata.cjs. */
const ARTICLE_METADATA = ${JSON.stringify(data, null, 1)};

export default ARTICLE_METADATA;
`);
console.log(`feed rows: ${rows(feed).length}, added: ${added}, total: ${Object.keys(data).length}`);
