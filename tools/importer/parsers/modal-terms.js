/* eslint-disable */
/* global WebImporter */
/**
 * Parser for modal-terms. Base: modal (custom, no library convention).
 * Source: https://www.woolworthsgroup.com.au/au/en/investors/our-performance/debt-investors.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json): .wwgmodal:has(modal.modal)
 *
 * Source structure (validated against block-context/modal-terms/source.html):
 *   .wwgmodal > modal.modal > .modal__container
 *     .modal__container__close button                     -> ignored (block renders its own)
 *     .modal__container__alert__msg                       -> alert label paragraph
 *     .modal__container__content__heading (text node)     -> h2 (corner graphic img ignored)
 *     .modal__container__content__text-area__note         -> p / ul children kept, &nbsp; spacers dropped
 *     .modal__container__cta > cta > .button__body (x2)   <- iterated (stable block wrapper)
 *         a[href] > button.button > span                  -> action link
 *   structure.json warns: button.button is nested in <a> (invalid, flattened on re-parse).
 *   So actions are keyed on .button__body, and text/href are read within each wrapper.
 *   "javascript:" hrefs (Accept) become "#accept"; Decline keeps its real href.
 *
 * Block table (blocks/modal-terms): one row, two cells
 *   [label p, h2, legal text... | <p><a>Decline</a></p> <p><a>Accept and Continue</a></p>]
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function stripAttrs(root) {
  [root, ...root.querySelectorAll('*')].forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (!['href', 'src', 'alt'].includes(attr.name)) el.removeAttribute(attr.name);
    });
  });
}

export default function parse(element, { document }) {
  const root = element.querySelector('.modal__container') || element;
  const content = [];

  const alert = clean(root.querySelector('.modal__container__alert__msg')?.textContent);
  if (alert) {
    const p = document.createElement('p');
    p.textContent = alert;
    content.push(p);
  }

  const headingEl = root.querySelector('.modal__container__content__heading');
  const heading = headingEl
    ? clean([...headingEl.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' '))
      || clean(headingEl.textContent)
    : '';
  if (heading) {
    const h2 = document.createElement('h2');
    h2.textContent = heading;
    content.push(h2);
  }

  const note = root.querySelector('.modal__container__content__text-area__note, .modal-note, .modal__container__content__text-area');
  if (note) {
    [...note.children].forEach((child) => {
      if (/^(SCRIPT|STYLE|SVG|IMG)$/i.test(child.tagName)) return;
      if (!clean(child.textContent)) return;
      const copy = child.cloneNode(true);
      stripAttrs(copy);
      content.push(copy);
    });
  }

  // Actions: iterate the .button__body wrappers, never the nested a>button pairs.
  let actionWrappers = [...root.querySelectorAll('.modal__container__cta .button__body')];
  if (!actionWrappers.length) actionWrappers = [...root.querySelectorAll('.modal__container__cta cta, .modal__container__cta > *')];
  const actions = [];
  actionWrappers.forEach((wrap) => {
    const text = clean(wrap.textContent);
    if (!text) return;
    const a = wrap.querySelector('a[href]');
    let href = a ? (a.getAttribute('href') || '').trim() : '';
    if (!href || /^javascript:/i.test(href) || href === '#') {
      href = `#${text.toLowerCase().split(/\s+/)[0]}`;
    }
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.href = href;
    link.textContent = text;
    p.append(link);
    actions.push(p);
  });

  // Empty-block guard.
  if (!content.length && !actions.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [[content.length ? content : '', actions.length ? actions : '']];
  const block = WebImporter.Blocks.createBlock(document, { name: 'modal-terms', cells });
  element.replaceWith(block);
}
