/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-timeline. Base: cards.
 * Source: https://www.woolworthsgroup.com.au/au/en/who-we-are/our-history.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json): .historytimeline
 *
 * Source structure (validated against block-context/cards-timeline/source.html):
 *   .historytimeline > historytimeline > .history-timeline
 *     > .history-timeline__section (x n, colour + panel--right modifiers)   <- iterated
 *         __left__content p.timeline--date     -> date paragraph (usually empty)
 *         __left__content p.timeline--title    -> h3 title
 *         __left__content .timeline--text > p  -> body paragraphs (nbsp-only dropped)
 *         p.year--head__title / p.timeline--year -> year (desktop + mobile duplicates; read once)
 *         .timeline--bg[style="background:url(...)"] -> image (DAM path made absolute)
 *     decorative divider <img class="*-img"> -> ignored
 *
 * Block table (cards convention / blocks/cards-timeline): one row per milestone
 *   [year | h3 title, paragraphs | image]
 */
const ORIGIN = 'https://www.woolworthsgroup.com.au';
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function bgUrl(el) {
  if (!el) return '';
  const style = el.getAttribute('style') || '';
  const m = style.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
  if (!m) return '';
  const url = m[1].trim();
  if (/^(https?:)?\/\//i.test(url)) return url;
  return url.startsWith('/') ? `${ORIGIN}${url}` : url;
}

export default function parse(element, { document }) {
  let sections = [...element.querySelectorAll('.history-timeline__section')];
  if (!sections.length) sections = [...element.querySelectorAll('[class*="timeline__section"]')];

  const cells = [];
  sections.forEach((section) => {
    const year = clean(section.querySelector('.year--head__title, .timeline--year, .tl--year')?.textContent);
    const title = clean(section.querySelector('.timeline--title, .tl--title')?.textContent);
    const date = clean(section.querySelector('.timeline--date, .tl--date')?.textContent);

    const body = [];
    if (title) {
      const h3 = document.createElement('h3');
      h3.textContent = title;
      body.push(h3);
    }
    if (date) {
      const p = document.createElement('p');
      p.textContent = date;
      body.push(p);
    }
    const textEl = section.querySelector('.timeline--text');
    if (textEl) {
      const blocks = [...textEl.children];
      if (!blocks.length && clean(textEl.textContent)) {
        const p = document.createElement('p');
        p.textContent = clean(textEl.textContent);
        body.push(p);
      }
      blocks.forEach((child) => {
        if (!clean(child.textContent)) return;
        const links = [...child.querySelectorAll('a[href]')];
        if (child.tagName === 'UL' || child.tagName === 'OL') {
          const list = document.createElement(child.tagName.toLowerCase());
          child.querySelectorAll('li').forEach((li) => {
            const item = document.createElement('li');
            item.textContent = clean(li.textContent);
            list.append(item);
          });
          body.push(list);
        } else if (links.length) {
          // keep inline links: clone and strip presentation attributes
          const copy = child.cloneNode(true);
          [copy, ...copy.querySelectorAll('*')].forEach((el) => {
            [...el.attributes].forEach((a) => { if (a.name !== 'href') el.removeAttribute(a.name); });
          });
          body.push(copy);
        } else {
          const p = document.createElement('p');
          p.textContent = clean(child.textContent);
          body.push(p);
        }
      });
    }

    let img = '';
    const src = bgUrl(section.querySelector('.timeline--bg'));
    const imgEl = section.querySelector('.history-timeline__section__right img');
    if (src || imgEl) {
      img = document.createElement('img');
      img.src = src || imgEl.getAttribute('src');
      img.alt = title || '';
    }

    if (!year && !body.length && !img) return;
    cells.push([year || '', body.length ? body : '', img]);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-timeline', cells });
  element.replaceWith(block);
}
