/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-spotlight. Base: columns.
 * Source: https://www.woolworthsgroup.com.au/au/en/our-newsroom.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json):
 *   .container__body__content.container__body__two-column:has(.h3-secondary):has(.wwgvideo, .mastercard)
 *
 * Source structure (validated against block-context/columns-spotlight/source.html + source-reconciliation.html):
 *   > .container__body__content__cols (x2)       <- the two columns (block-level divs)
 *   media column:
 *     .wwgvideo .cmp-video: a.cmp-video__body__link[href=Scene7 viewer] > img (poster),
 *        p.cmp-video__body__content__title (top + bottom duplicates -> one caption)
 *     or .mastercard card: button.card__video__link[data-href] > .cmp-image img, .card__title
 *   text column:
 *     .heading .heading-container__body__text__content -> h2
 *     .cmp-text p                                       -> paragraphs (styles/br stripped)
 *     .button a[href] (a > button nesting: text read from span.cmp-button__text / title) -> CTA
 *     .contactpanel: title + value link (empty mailto: rebuilt from the address text)
 *
 * Legal pages (block-context/columns-spotlight/source-legal-dual-container.html, e.g. /privacy/protection.html):
 *   imagevideotext.dual-container > .dual-container__body > .dual-container__main
 *     .dual-container__main__blk (media column)
 *       a.dual-container__main__blk__media__video__link[href=Scene7 viewer] > .cmp-image img (poster)
 *     .dual-container__main__text (text column): .heading + .cmp-text (p, ul > li > p)
 *   .video_modal (empty player shell)                -> dropped
 *   The two dual-container halves stand in for the two __cols; extraction is otherwise shared.
 *
 * Block table (columns convention / blocks/columns-spotlight): one row, 2 cells
 *   [poster img, video link, caption | heading, paragraphs, CTA / contact line]
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function makeImg(imgEl, document) {
  if (!imgEl) return null;
  let src = imgEl.getAttribute('src') || '';
  if (!src || src.startsWith('data:')) {
    const dm = imgEl.closest('[data-cmp-src]');
    src = dm ? (dm.getAttribute('data-cmp-src') || '').replace('{.width}', '') : '';
  }
  if (!src || src.startsWith('data:')) return null;
  const img = document.createElement('img');
  img.src = src;
  img.alt = imgEl.getAttribute('alt') || '';
  return img;
}

function para(text, document, tag = 'p') {
  const p = document.createElement(tag);
  p.textContent = text;
  return p;
}

function linkPara(href, text, document) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  p.append(a);
  return p;
}

function mediaCell(col, document) {
  const out = [];
  const img = makeImg(col.querySelector('.cmp-video__body__link img, .card__video img, .cmp-image img, img'), document);
  if (img) out.push(img);
  const videoA = col.querySelector('a.cmp-video__body__link[href], a.dual-container__main__blk__media__video__link[href]');
  const videoBtn = col.querySelector('button[data-href]');
  const href = videoA ? videoA.getAttribute('href') : (videoBtn ? videoBtn.getAttribute('data-href') : '');
  const captionEl = col.querySelector('.cmp-video__body__content__title, .card__title');
  const caption = clean(captionEl && captionEl.textContent);
  if (href) out.push(linkPara(href, 'Watch video', document));
  if (caption) out.push(para(caption, document));
  return out;
}

function textCell(col, document) {
  const out = [];
  const headingEl = col.querySelector('.heading-container__body__text__content')
    || col.querySelector('.cmp-title h1, .cmp-title h2, .cmp-title h3, h1, h2, h3');
  if (headingEl && clean(headingEl.textContent)) out.push(para(clean(headingEl.textContent), document, 'h2'));

  col.querySelectorAll('.cmp-text').forEach((t) => {
    [...t.children].forEach((child) => {
      if (!clean(child.textContent)) return;
      if (child.tagName === 'UL' || child.tagName === 'OL') {
        const list = document.createElement(child.tagName.toLowerCase());
        child.querySelectorAll('li').forEach((li) => list.append(para(clean(li.textContent), document, 'li')));
        out.push(list);
        return;
      }
      const links = [...child.querySelectorAll('a[href]')];
      if (links.length === 1 && clean(links[0].textContent) === clean(child.textContent)) {
        out.push(linkPara(links[0].getAttribute('href'), clean(child.textContent), document));
      } else {
        out.push(para(clean(child.textContent), document));
      }
    });
  });

  col.querySelectorAll('.button a[href], cta a[href]').forEach((a) => {
    const text = clean(a.querySelector('.cmp-button__text')?.textContent)
      || clean(a.textContent) || clean(a.getAttribute('title'))
      || clean(a.nextElementSibling?.querySelector('.cmp-button__text')?.textContent);
    if (text) out.push(linkPara(a.getAttribute('href'), text, document));
  });

  col.querySelectorAll('.contact-panel, contactpanel').forEach((panel) => {
    const title = clean(panel.querySelector('.contact-panel__body__content__title')?.textContent);
    if (title) {
      const p = document.createElement('p');
      const s = document.createElement('strong');
      s.textContent = title;
      p.append(s);
      out.push(p);
    }
    panel.querySelectorAll('.contact-panel__body__content__value').forEach((v) => {
      const a = v.querySelector('a');
      const text = clean(v.textContent);
      if (!text) return;
      if (a) {
        let href = a.getAttribute('href') || '';
        if (/^mailto:$/i.test(href) || !href) href = text.includes('@') ? `mailto:${text}` : (text.match(/^[\d\s+()]+$/) ? `tel:${text.replace(/\s/g, '')}` : href);
        out.push(href ? linkPara(href, text, document) : para(text, document));
      } else {
        out.push(para(text, document));
      }
    });
  });
  return out;
}

export default function parse(element, { document }) {
  let cols = [...element.querySelectorAll(':scope > .container__body__content__cols')];
  let dual = false;
  if (!cols.length) {
    // imagevideotext.dual-container (legal pages): media half + text half
    const blk = element.querySelector('.dual-container__main__blk');
    const txt = element.querySelector('.dual-container__main__text');
    if (blk || txt) {
      dual = true;
      cols = [blk, txt].filter(Boolean);
    }
  }
  let mediaCol = dual
    ? cols.find((c) => c.matches('.dual-container__main__blk'))
    : cols.find((c) => c.querySelector('.wwgvideo, .mastercard, .cmp-video, card'));
  let textCol = cols.find((c) => c !== mediaCol && c.querySelector('.heading, .text, .cmp-text'));
  if (!mediaCol) mediaCol = cols[0];
  if (!textCol) textCol = cols.find((c) => c !== mediaCol);

  const media = mediaCol ? mediaCell(mediaCol, document) : [];
  const text = textCol ? textCell(textCol, document) : [];

  // Empty-block guard.
  if (!media.length && !text.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // keep source column order (media first in all known instances)
  const mediaFirst = !textCol || !mediaCol || cols.indexOf(mediaCol) < cols.indexOf(textCol);
  const row = mediaFirst ? [media.length ? media : '', text.length ? text : ''] : [text.length ? text : '', media.length ? media : ''];
  const cells = [row];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-spotlight', cells });
  element.replaceWith(block);
}
