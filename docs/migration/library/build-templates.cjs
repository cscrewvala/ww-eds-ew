/* Build da.live page templates from representative migrated pages: same sections, blocks, section
 * metadata and metadata, with placeholder text (formatting kept: bold/links/lists), long runs trimmed.
 * Usage: node build-templates.cjs <da-docs-dir> <out-dir>
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('/tmp/libtools/node_modules/jsdom');

const [docsDir, outDir] = process.argv.slice(2);
const CONTENT = 'https://content.da.live/cscrewvala/ww-eds-ew';

const TEMPLATES = [
  ['News article', 'news-article', 'au/en/our-newsroom/media-releases/latest-news/2026/woolworths-locks-in-cinnabon-cake-as-a-permanent-bakery-hero'],
  ['Story article', 'story-article', 'au/en/our-impact/sustainability/our-stories/2026/2026-world-environment-day'],
  ['Story with banner', 'story-banner', 'au/en/our-impact/sustainability/our-stories/2024/living-healthy-report-2024'],
  ['Content page', 'content-page', 'au/en/our-impact/sustainability/social-impact'],
  ['Listing page', 'listing-page', 'au/en/our-newsroom/media-releases'],
  ['Investor page', 'investor-page', 'au/en/investors/our-performance/asx-announcements'],
  ['Legal page', 'legal-page', 'au/en/privacy/collection'],
  ['Leadership profile', 'leadership-profile', 'au/en/who-we-are/our-leadership-team/board-of-directors/jennifer-carr-smith'],
];

// blocks whose cells are settings, not copy: keep verbatim
const KEEP_BLOCKS = new Set(['article-list', 'search', 'embed-iframe', 'section-metadata', 'cards-calendar']);
const KEEP_ROWS = { 'accordion-program': 2, 'cards-documents': 2, 'cards-story': 3, 'cards-tile': 3, 'cards-logo': 3, 'cards-profile': 3, 'cards-video': 3, 'cards-timeline': 3, 'table-data': 3 };
const MAX_PARAS = 3; // consecutive paragraphs kept per section run

const TEXT = {
  H1: 'Page title', H2: 'Section heading', H3: 'Subheading', H4: 'Subheading', H5: 'Subheading', H6: 'Subheading',
  P: 'Add paragraph text here.', LI: 'List item', TD: 'Cell text', TH: 'Column heading',
};
const INLINE = { STRONG: 'Bold text', B: 'Bold text', EM: 'Emphasis', I: 'Emphasis', A: 'Link text' };

function placeholderize(el, inBlock = false) {
  // replace every text node with placeholder copy, keeping the element structure
  const walker = el.ownerDocument.createTreeWalker(el, 4);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((t) => {
    if (!t.textContent.trim()) return;
    const parent = t.parentElement;
    const link = parent.closest('a');
    // Scene7 / DAM image links keep their (alt) text: they are the image
    if (link && /\/is\/image\/|\/adobe\/assets\//.test(link.getAttribute('href') || '')) return;
    const inline = Object.keys(INLINE).find((k) => parent.closest(k.toLowerCase()) && parent.closest(k.toLowerCase()) !== el);
    const block = parent.closest('h1,h2,h3,h4,h5,h6,p,li,td,th') || parent;
    let text = (inline && INLINE[inline]) || TEXT[block.tagName] || TEXT.P;
    // a paragraph right before a heading in the same cell is a label (hero category)
    if (inBlock && block.tagName === 'P' && !inline && /^H[1-6]$/.test(block.nextElementSibling?.tagName || '')) text = 'Label';
    // news dateline: <p><strong>15 October 2026:</strong> …</p>
    if (inline && /^(STRONG|B)$/.test(inline) && /:\s*$/.test(t.textContent) && block.firstChild === parent) text = 'DD Month YYYY:';
    if (!inline && block.tagName === 'P' && block.firstElementChild && /^(STRONG|B)$/.test(block.firstElementChild.tagName)
      && /:\s*$/.test(block.firstElementChild.textContent)) text = 'Opening paragraph.';
    const lead = /^\s/.test(t.textContent) ? ' ' : '';
    const tail = /\s$/.test(t.textContent) ? ' ' : '';
    t.textContent = `${lead}${text}${tail}`;
  });
  el.querySelectorAll('a[href]').forEach((a) => {
    // media links (images, Scene7 videos, video files) stay: they are the placeholder media
    if (!/\/is\/image\/|\/is\/content\/|\/adobe\/assets\/|s7viewers|\.(mp4|webm)(\?|$)/.test(a.getAttribute('href'))) a.setAttribute('href', '#');
  });
  el.removeAttribute('id');
  el.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
}

function metadata(md) {
  [...md.children].forEach((row) => {
    const key = (row.children[0]?.textContent || '').trim().toLowerCase();
    const val = row.children[1];
    if (!val) return;
    const set = (v) => { val.textContent = v; };
    if (key === 'title') set('Page title');
    else if (key === 'description') set('Page description (used in search results, listings and social shares)');
    else if (key === 'date') set('yyyy-mm-dd');
    else if (key === 'tags') set('Category, Category');
    else if (key === 'card-description') set('');
  });
}

function build(srcPath) {
  const html = fs.readFileSync(path.join(docsDir, `${srcPath}.html`), 'utf8');
  const doc = new JSDOM(html).window.document;
  const main = doc.querySelector('main');
  [...main.children].forEach((section) => {
    let run = 0;
    [...section.children].forEach((el) => {
      const name = el.tagName === 'DIV' ? (el.className || '').split(/\s+/)[0] : '';
      if (name === 'metadata') { metadata(el); return; }
      if (name) {
        if (KEEP_BLOCKS.has(name)) return;
        const keep = KEEP_ROWS[name];
        if (keep) [...el.children].slice(keep).forEach((r) => r.remove());
        placeholderize(el, true);
        run = 0;
        return;
      }
      // default content: trim long runs of paragraphs
      if (el.tagName === 'P' && !el.querySelector('a[href*="/is/image/"], picture')) {
        run += 1;
        if (run > MAX_PARAS) { el.remove(); return; }
      } else run = 0;
      if (el.tagName === 'UL' || el.tagName === 'OL') [...el.children].slice(3).forEach((li) => li.remove());
      placeholderize(el);
    });
  });
  return doc.body.outerHTML;
}

fs.mkdirSync(path.join(outDir, 'library/templates'), { recursive: true });
const rows = [];
TEMPLATES.forEach(([label, file, src]) => {
  const out = build(src);
  fs.writeFileSync(path.join(outDir, 'library/templates', `${file}.html`), out);
  rows.push({ key: label, value: `${CONTENT}/library/templates/${file}` });
  const blocks = [...out.matchAll(/<div class="([a-z0-9-]+)[ "]/g)].map((m) => m[1]);
  console.log(file.padEnd(20), `${(out.length / 1024).toFixed(1)}KB`, [...new Set(blocks)].join(', '));
});
const sheet = { ':type': 'sheet', ':colWidths': [220, 640], total: rows.length, limit: rows.length, offset: 0, data: rows };
fs.writeFileSync(path.join(outDir, 'library/templates.json'), JSON.stringify(sheet, null, 1));
console.log(`${rows.length} templates`);
