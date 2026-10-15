/* eslint-disable */
/* global WebImporter */
/**
 * Parser for quote-story. Base: quote (custom block, no library convention).
 * Source: https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2025/woolworths-farmer-cattle-partnership.html
 * Generated: 2026-10-14
 *
 * Source structure (validated against block-context/quote-story/source.html):
 *   .pullquote > .pull-container > .pull-container-wrapper
 *     .start-quote / .end-quote  (decorative quote marks)   -> ignored
 *     .pull-quote__eyebrow       (attribution, optional)    -> row 2
 *     .quote-text > i            (quote text)              -> row 1
 *
 * Content-page variant (block-context/quote-story/source-refrigeration.html):
 *   .text > .cmp-text > blockquote (x n)
 *     blockquote > span.h5 > i            (quote text, one paragraph per blockquote) -> row 1
 *     blockquote starting with "-" / "–"   (attribution, e.g. "- Caroline Fitzgerald, ...") -> row 2
 *     blank blockquotes (&nbsp;)           -> dropped
 *     non-blockquote siblings in .cmp-text  -> kept as default content around the block
 *
 * Block table (blocks/quote-story/quote-story.js, 1 column):
 *   row 1: quote text (one or more paragraphs)
 *   row 2: attribution (only when present)
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
// Strip straight/curly quote marks authored around the text; the block adds its own mark.
const unquote = (s) => s.replace(/^["“”']+\s*/, '').replace(/\s*["“”']+$/, '');

const ATTRIBUTION = /^[-–—]\s*/;

function buildBlock(quoteParas, italic, attribution, document, variant = '') {
  const cells = [];
  cells.push([quoteParas.map((text) => {
    const p = document.createElement('p');
    if (italic) {
      const em = document.createElement('em');
      em.textContent = text;
      p.append(em);
    } else {
      p.textContent = text;
    }
    return p;
  })]);
  if (attribution) {
    const p = document.createElement('p');
    p.textContent = attribution;
    cells.push([p]);
  }
  return WebImporter.Blocks.createBlock(document, { name: variant ? `quote-story (${variant})` : 'quote-story', cells });
}

// .text > .cmp-text > blockquote* (content pages). Pullquote markup never has blockquotes.
function parseBlockquotes(element, document) {
  const textRoot = element.querySelector('.cmp-text') || element;
  const quotes = [...textRoot.querySelectorAll(':scope > blockquote')];
  if (!quotes.length || element.querySelector('.pull-container, .quote-text')) return null;

  const quoteParas = [];
  let attribution = '';
  let italic = true;
  quotes.forEach((bq) => {
    const text = clean(bq.textContent);
    if (!text) return;
    if (ATTRIBUTION.test(text)) {
      attribution = text.replace(ATTRIBUTION, '');
      return;
    }
    const em = bq.querySelector('i, em');
    if (!(em && clean(em.textContent).length >= text.length - 2)) italic = false;
    const q = unquote(text);
    if (q) quoteParas.push(q);
  });
  if (!quoteParas.length) return null;

  // other rich-text siblings stay as default content around the block
  const kids = [...textRoot.children];
  const first = kids.indexOf(quotes[0]);
  const last = kids.indexOf(quotes[quotes.length - 1]);
  const keep = (el) => clean(el.textContent) || el.querySelector('img');
  const before = kids.slice(0, first).filter((el) => el.tagName !== 'BLOCKQUOTE' && keep(el));
  const after = kids.slice(last + 1).filter((el) => el.tagName !== 'BLOCKQUOTE' && keep(el));
  return { block: buildBlock(quoteParas, italic, attribution, document, 'blockquote'), before, after };
}

export default function parse(element, { document }) {
  const bq = parseBlockquotes(element, document);
  if (bq) {
    const { block, before, after } = bq;
    element.before(...before);
    element.after(...after);
    element.replaceWith(block);
    return;
  }

  const quoteEl = element.querySelector('.quote-text')
    || element.querySelector('blockquote, [class*="quote-text"]');
  const attributionEl = element.querySelector('.pull-quote__eyebrow')
    || element.querySelector('[class*="eyebrow"], cite, figcaption');

  let quoteParas = [];
  if (quoteEl) {
    const ps = [...quoteEl.querySelectorAll('p')];
    quoteParas = (ps.length ? ps.map((p) => clean(p.textContent)) : [clean(quoteEl.textContent)])
      .map(unquote).filter(Boolean);
  }
  const attribution = clean(attributionEl ? attributionEl.textContent : '');

  // Empty-block guard.
  if (!quoteParas.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Preserve emphasis when the whole quote is italicised in the source (<i>/<em>).
  const italic = !!(quoteEl && quoteEl.querySelector('i, em')
    && clean(quoteEl.querySelector('i, em').textContent).length >= clean(quoteEl.textContent).length - 2);

  const block = buildBlock(quoteParas, italic, attribution, document);
  element.replaceWith(block);
}
