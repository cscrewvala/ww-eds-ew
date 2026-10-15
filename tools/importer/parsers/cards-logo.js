/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-logo. Base: cards.
 * Source: https://www.woolworthsgroup.com.au/au/en/who-we-are/our-brands.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json): .ecosystem:not(.ecosystem *)
 *
 * Source structure (validated against block-context/cards-logo/source.html + source-our-newsroom.html):
 *   .ecosystem > ecosystem > .ecosystem__body > .ecosystem__body__brands
 *     > .ecosystem__body__brands__item (x n)              <- iterated (block-level div)
 *         .ecosystem__body__brands__item__logo--md img     -> cell 1 logo (--sm is a duplicate, ignored)
 *         .ecosystem__body__brands__item__content__name    -> name paragraph
 *         .ecosystem__body__brands__item__content__cta     -> visible link label
 *         .ecosystem__body__brands__item__cta a[href]      -> link href (a > button nesting is never
 *                                                             iterated; label falls back to button text)
 *         .ecosystem__body__brands__item__description      -> "Read more" pop-up copy (one per item, outside
 *                                                             the --sm/--md logo copies) -> description p/ul
 *     .ecosystem__body__cta ("Show more" button)          -> dropped (JS pagination control)
 *
 * Description: emitted for every card (p / ul; nbsp-only paragraphs and edge <br>s dropped; text equal to
 * the name, link label or an already-emitted paragraph is skipped). Some sources glue the CTA label onto
 * the copy (newsroom LinkedIn: "Follow Us on LinkedInWoolworths Group is ...") - a leading label prefix is
 * stripped so description and link text never run together.
 *
 * Legal pages (block-context/cards-logo/source-legal-managing.html, e.g. /privacy/managing-your-information.html):
 *   Same item markup, but .ecosystem__body__brands__item__cta holds an EMPTY <cta> (no link button)
 *   and __content__cta ("Options available to you") only opens the modal, so no link is emitted.
 *   Links inside the description are never used as the card link.
 *
 * Block table (cards convention / blocks/cards-logo): one row per card
 *   [logo img | name h3, description p..., link p]   (brand cards)
 *   [logo img | name h3, description p...]           (no-link variant)
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
  const alt = imgEl.getAttribute('alt') || '';
  img.alt = /^untitled design/i.test(alt) ? '' : alt;
  return img;
}

export default function parse(element, { document }) {
  let items = [...element.querySelectorAll('.ecosystem__body__brands__item')];
  if (!items.length) items = [...element.querySelectorAll('[class*="brands__item"]')].filter((i) => i.querySelector('img'));

  const cells = [];
  items.forEach((item) => {
    const img = makeImg(
      item.querySelector('.ecosystem__body__brands__item__logo--md img')
        || item.querySelector('.ecosystem__body__brands__item__logo img, img'),
      document,
    );
    const name = clean(item.querySelector('.ecosystem__body__brands__item__content__name')?.textContent);
    const a = item.querySelector('.ecosystem__body__brands__item__cta a[href]')
      || [...item.querySelectorAll('a[href]')].find((x) => !x.closest('.ecosystem__body__brands__item__description'));
    const label = clean(item.querySelector('.ecosystem__body__brands__item__content__cta')?.textContent)
      || clean(a && a.textContent)
      || clean(item.querySelector('.ecosystem__body__brands__item__cta .cmp-button__text')?.textContent);

    const body = [];
    if (name) {
      const h = document.createElement('h3');
      h.textContent = name;
      body.push(h);
    }

    // Description ("Read more" pop-up copy). Scoped to the item-level wrapper only.
    const seen = new Set([name, label].filter(Boolean).map((t) => t.toLowerCase()));
    const blank = (n) => n && (n.nodeName === 'BR' || (n.nodeType === 3 && !clean(n.textContent)));
    const stripPrefix = (el) => {
      // Remove a leading CTA label glued onto the copy ("Follow Us on LinkedInWoolworths Group ...").
      // Only when glued (no space after the label) - "Visit Petstock at www..." is real copy.
      [label].filter(Boolean).forEach((pre) => {
        const text = clean(el.textContent);
        if (!text.toLowerCase().startsWith(pre.toLowerCase())
          || text.length <= pre.length || /\s/.test(text.charAt(pre.length))) return;
        const walker = document.createTreeWalker(el, 4);
        let rest = pre;
        let node = walker.nextNode();
        while (node && rest) {
          const t = node.textContent.replace(/\u00a0/g, ' ').replace(/^\s+/, '');
          const take = Math.min(rest.length, t.length);
          node.textContent = t.slice(take);
          rest = rest.slice(take).replace(/^\s+/, '');
          node = walker.nextNode();
        }
      });
    };
    const desc = item.querySelector(':scope > .ecosystem__body__brands__item__description')
      || item.querySelector('.ecosystem__body__brands__item__description');
    if (desc) {
      const children = [...desc.children];
      const sources = children.length ? children : [desc];
      let first = true;
      sources.forEach((child) => {
        if (!clean(child.textContent)) return;
        if (child.tagName === 'UL' || child.tagName === 'OL') {
          const list = document.createElement(child.tagName.toLowerCase());
          child.querySelectorAll('li').forEach((li) => {
            const nli = document.createElement('li');
            nli.innerHTML = li.innerHTML;
            list.append(nli);
          });
          const key = clean(list.textContent).toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          body.push(list);
          first = false;
          return;
        }
        const p = document.createElement('p');
        if (child === desc) p.textContent = clean(desc.textContent);
        else p.innerHTML = child.innerHTML;
        if (first) stripPrefix(p);
        while (blank(p.firstChild)) p.firstChild.remove();
        while (blank(p.lastChild)) p.lastChild.remove();
        const key = clean(p.textContent).toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        body.push(p);
        first = false;
      });
    }

    if (a && label) {
      const p = document.createElement('p');
      const link = document.createElement('a');
      link.href = a.getAttribute('href');
      link.textContent = label;
      p.append(link);
      body.push(p);
    }
    if (!img && !body.length) return;
    cells.push([img || '', body.length ? body : '']);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-logo', cells });
  element.replaceWith(block);
}
