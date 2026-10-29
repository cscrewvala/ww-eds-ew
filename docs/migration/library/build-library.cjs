/* Build the da.live block library from the migrated DA documents.
 * Usage: node build-library.cjs <repo> <da-docs-dir> <out-dir>
 * Writes <out>/library/blocks/<block>.html (one real example per visual variant + library-metadata),
 * <out>/library/blocks.json (multi-sheet: blocks [name, path], options [key, blocks, values, type, label]).
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('/tmp/libtools/node_modules/jsdom');

const [repo, docsDir, outDir] = process.argv.slice(2);
const ORG = 'cscrewvala';
const SITE = 'ww-eds-ew';
const CONTENT = `https://content.da.live/${ORG}/${SITE}`;

// author-facing descriptions (shown from the info icon in the block dialog)
const DESCRIPTIONS = {
  'hero-article': 'Page hero for articles, investor and legal pages: full-width image with an optional label and the page title. Options: gradient, no-overlay, subtitle, top/bottom/right (image focus).',
  'hero-banner': 'Large banner hero (home and landing pages): full-width image with the page title and optional text.',
  'hero-story': 'Story hero: image beside the story title and intro. Option offset-top lifts the image.',
  'hero-brand': 'Brand hero with a logo/icon and a tagline (100 Years of WWG).',
  'carousel-hero': 'Hero carousel: one row per slide (image | text). A Scene7 video link in the text cell makes it a background video. Interval: page metadata "carousel-interval". Options: gradient, no-overlay, hide-controls.',
  'video-story': 'Video teaser: poster image with a play button that opens the video (Scene7 viewer or MP4), with an optional title and description row. Option tile = card style.',
  'quote-story': 'Pull quote: row 1 the quote, row 2 the attribution. Option blockquote = boxed quote.',
  'modal-terms': 'Terms gate: the terms text and the accept/decline buttons shown in a dialog before continuing.',
  'accordion-program': 'Expandable sections: one row per item (heading | content). Options: open-first, inset, berry-bullets.',
  'cards-calendar': 'Event calendar: one row per event (date dd/mm/yyyy | event details); adds "add to calendar" links.',
  'cards-documents': 'Document list: one row per group (group title | list of document links, e.g. PDFs).',
  'cards-featured': 'Featured stories: first card large, the others as a list beside it. One row per card (image | label, title, link).',
  'cards-logo': 'Logo cards with a pop-up detail: one row per card (logo | title, text, link).',
  'cards-profile': 'People cards (board, executives): one row per person (photo | name, role, link to profile).',
  'cards-resource': 'Resource cards: one row per card (image | title, text, link).',
  'cards-stats': 'Stats / goals grid: optional header row (heading + intro), one row per stat (figure | caption), optional final call-to-action link row. Options: panel, tint-sky-5.',
  'cards-story': 'Story/news cards: one row per card (image | label, title, link). A video link instead of a page link makes it a video card.',
  'cards-tile': 'Tiles: one row per tile (image | title, text, link). Option cols-2 = two per row.',
  'cards-timeline': 'History timeline: one row per entry (year | era | content | image).',
  'cards-video': 'Video cards (webcasts, results): one row per video (poster image | video link and caption).',
  'columns-contact': 'Contact details in up to four columns (addresses, phone, email).',
  'columns-gallery': 'Image gallery: two or three images side by side.',
  'columns-logos': 'Logo strip: up to six logos/badges in a row.',
  'columns-media': 'Text beside an image (text | image). Options: image-border, bullets-berry.',
  'columns-panel': 'Panel with headings and text beside an image (text | image).',
  'columns-spotlight': 'Spotlight: image (or video) with links beside a heading and text. Option dual = two equal spotlights.',
  'columns-text': 'Text columns: up to three columns of heading + text per row.',
  'embed-iframe': 'Embedded tools (share price, calculators): one row per embed (tab label | URL | height). Several rows become tabs.',
  'fragment': 'Includes a shared fragment page: a link to the fragment path.',
  'table-data': 'Data table: first row = column headers, then one row per data row; cells may contain links.',
  'article-list': 'Dynamic news / story listing from the article index. Settings: Source (folder), Layout (news, stories, featured), Limit, Filters (category, year, sort), Tags, Categories, Featured.',
  search: 'Site search results page: index URL row, category rows (label | path prefix) and Page size.',
};

// how many rows to keep in a library example (containers get trimmed)
const KEEP_ROWS = {
  'accordion-program': 3, 'cards-calendar': 3, 'cards-documents': 2, 'cards-logo': 3, 'cards-profile': 3,
  'cards-resource': 3, 'cards-story': 3, 'cards-tile': 3, 'cards-timeline': 3, 'cards-video': 3, 'table-data': 5,
};
const MAX_VARIANTS = 8;

const defs = JSON.parse(fs.readFileSync(path.join(repo, 'component-definition.json'), 'utf8')).groups.flatMap((g) => g.components);
const models = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(repo, 'component-models.json'), 'utf8')).map((m) => [m.id, m]));
const sectionFilter = JSON.parse(fs.readFileSync(path.join(repo, 'component-filters.json'), 'utf8')).find((f) => f.id === 'section').components;
const BLOCKS = sectionFilter.filter((c) => !['text', 'image'].includes(c));
const title = (b) => (defs.find((d) => d.id === b) || {}).title || b;

// collect instances
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []));
const instances = {};
walk(docsDir).forEach((f) => {
  const html = fs.readFileSync(f, 'utf8');
  if (!html.includes('class="')) return;
  const doc = new JSDOM(html).window.document;
  doc.querySelectorAll('main > div > div[class]').forEach((el) => {
    const [name, ...variants] = el.className.trim().split(/\s+/);
    if (!BLOCKS.includes(name)) return;
    const key = variants.sort().join(' ');
    instances[name] = instances[name] || {};
    const v = instances[name][key] = instances[name][key] || { count: 0, html: null, rows: 0 };
    v.count += 1;
    // prefer a fuller example (more rows) up to the trim limit
    const rows = el.children.length;
    if (!v.html || (rows > v.rows && v.rows < (KEEP_ROWS[name] || 99))) { v.html = el.outerHTML; v.rows = rows; }
  });
});

function trim(name, blockEl) {
  const keep = KEEP_ROWS[name];
  if (!keep) return;
  const rows = [...blockEl.children];
  if (name === 'cards-stats') return;
  rows.slice(keep).forEach((r) => r.remove());
}

function blockDoc(name) {
  const dom = new JSDOM('<body><header></header><main></main><footer></footer></body>');
  const doc = dom.window.document;
  const main = doc.querySelector('main');
  const variants = Object.entries(instances[name] || {}).sort((a, b) => b[1].count - a[1].count).slice(0, MAX_VARIANTS);
  variants.forEach(([, v]) => {
    const section = doc.createElement('div');
    const holder = doc.createElement('div');
    holder.innerHTML = v.html;
    const block = holder.firstElementChild;
    trim(name, block);
    block.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
    section.append(block);
    const md = doc.createElement('div');
    md.className = 'library-metadata';
    md.innerHTML = `<div><div>description</div><div>${DESCRIPTIONS[name] || title(name)}</div></div>`;
    section.append(md);
    main.append(section);
  });
  if (!variants.length) {
    // no instance in content (e.g. fragment): an empty starter table
    const section = doc.createElement('div');
    section.innerHTML = name === 'fragment'
      ? `<div class="fragment"><div><div><a href="/au/en/fragments/example">/au/en/fragments/example</a></div></div></div>`
      : `<div class="${name}"><div><div></div></div></div>`;
    const md = doc.createElement('div');
    md.className = 'library-metadata';
    md.innerHTML = `<div><div>description</div><div>${DESCRIPTIONS[name] || title(name)}</div></div>`;
    section.append(md);
    main.append(section);
  }
  return { html: doc.body.outerHTML, variants: variants.map(([k, v]) => `${k || '(default)'} x${v.count}`) };
}

const sheet = (rows, widths) => ({ total: rows.length, limit: rows.length, offset: 0, data: rows, ':colWidths': widths });

fs.mkdirSync(path.join(outDir, 'library/blocks'), { recursive: true });
const blockRows = [];
BLOCKS.forEach((b) => {
  const { html, variants } = blockDoc(b);
  fs.writeFileSync(path.join(outDir, 'library/blocks', `${b}.html`), html);
  blockRows.push({ name: title(b), path: `${CONTENT}/library/blocks/${b}` });
  console.log(b.padEnd(20), variants.join(', ') || '(starter)');
});
blockRows.sort((a, b) => a.name.localeCompare(b.name));

// block options: section styles + page metadata, from the Universal Editor models (same vocabulary)
const opt = (o) => (o.name === o.value ? o.value : `${o.name}=${o.value}`);
const sectionStyle = models.section.fields.find((f) => f.name === 'style');
const page = models['page-metadata'].fields;
const optionRows = [
  { key: 'style', blocks: 'section-metadata', values: sectionStyle.options.map(opt).join(' | '), type: 'multi', label: 'Style' },
  ...page.map((f) => ({
    key: f.name,
    blocks: 'metadata',
    values: (f.options || []).map(opt).join(' | '),
    type: '',
    label: f.label,
  })),
];
const blocksJson = {
  ':names': ['blocks', 'options'], ':type': 'multi-sheet', ':version': 3,
  blocks: sheet(blockRows, [260, 640]),
  options: sheet(optionRows, [160, 160, 520, 80, 200]),
};
fs.writeFileSync(path.join(outDir, 'library/blocks.json'), JSON.stringify(blocksJson, null, 1));
console.log(`\n${blockRows.length} blocks, ${optionRows.length} option rows`);
