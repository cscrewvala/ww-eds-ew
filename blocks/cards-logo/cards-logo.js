import { createOptimizedPicture, moveInstrumentation } from '../../scripts/scripts.js';

/**
 * cards-logo: brand / channel cards - logo on the left, name + link on the right.
 * Grid of fixed-width cards, centered (a single card sits centered on its own).
 * Each authored row is one card:
 *   cell 1: logo image
 *   cell 2: name (heading or paragraph), optional description paragraph(s)/list,
 *           link ("Visit Woolworths", "Follow Us on LinkedIn")
 * Cells may be merged or swapped - the logo is detected by its picture.
 *
 * As on the source (.ecosystem), the card itself only shows logo + name + link; the
 * description lives in a modal dialog opened from the card / name (logo, name,
 * description and the link as a button). Below 768px only the first 5 cards are shown,
 * with a "Show more" / "Show less" toggle under the grid.
 * @param {Element} block
 */

const MOBILE_VISIBLE = 5;
const SVG_NS = 'http://www.w3.org/2000/svg';

let uid = 0;
const nextId = (prefix) => {
  uid += 1;
  return `${prefix}-${uid}`;
};

function svgIcon(className, paths, stroke = 'currentColor') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  paths.forEach((d) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    if (stroke) {
      path.setAttribute('stroke', stroke);
      path.setAttribute('stroke-width', '2');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
    } else {
      path.setAttribute('fill', 'currentColor');
    }
    svg.append(path);
  });
  return svg;
}

const closeIcon = () => svgIcon('cards-logo-icon-close', ['M8 8L24 24M8 24L24 8']);
const externalIcon = () => svgIcon('cards-logo-icon-external', [
  'M13.333 8H8a2.667 2.667 0 0 0-2.667 2.667V24A2.667 2.667 0 0 0 8 26.667h13.333A2.667 2.667 0 0 0 24 24v-5.333M18.667 5.333h8m0 0v8m0-8L13.333 18.667',
]);
const chevronIcon = () => svgIcon('cards-logo-icon-chevron', [
  'M3 11.728l10.313 10.3a3.786 3.786 0 0 0 5.36 0L29 11.717l-2.298-2.294-10.325 10.31a.54.54 0 0 1-.766 0L5.298 9.435z',
], null);

function isExternal(href) {
  try {
    return new URL(href, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function buildCard(row) {
  const li = document.createElement('li');
  moveInstrumentation(row, li);
  const logo = document.createElement('div');
  logo.className = 'cards-logo-image';
  const body = document.createElement('div');
  body.className = 'cards-logo-body';

  [...row.children].forEach((cell) => {
    const pic = cell.querySelector('picture');
    if (pic && !logo.children.length) {
      const holder = pic.parentElement;
      logo.append(pic);
      if (holder && holder !== cell && !holder.textContent.trim() && !holder.querySelector('picture')) {
        holder.remove();
      }
    }
    // Universal Editor: the text cell's field moves to the card body
    moveInstrumentation(cell, body);
    if (!cell.children.length) {
      const text = cell.textContent.trim();
      if (text) {
        const p = document.createElement('p');
        p.textContent = text;
        body.append(p);
      }
      return;
    }
    body.append(...[...cell.children].filter((el) => el.textContent.trim() || el.querySelector('picture')));
  });

  const children = [...body.children];
  const name = children.find((el) => /^H[1-6]$/.test(el.tagName))
    || children.find((el) => !el.querySelector('a[href]')) || null;
  // CTA = last element that is only a link; description paragraphs may contain inline links.
  const isLinkOnly = (el) => {
    const a = el.querySelector('a[href]');
    return a && a.textContent.trim() === el.textContent.trim();
  };
  const linkEl = children.findLast((el) => el !== name && isLinkOnly(el))
    || children.find((el) => el !== name && el.querySelector('a[href]')) || null;
  if (name) name.classList.add('cards-logo-name');
  if (linkEl) linkEl.classList.add('cards-logo-link');

  const descEls = children.filter((el) => el !== name && el !== linkEl);

  if (logo.children.length) li.append(logo);
  else li.classList.add('cards-logo-no-image');
  if (body.children.length || body.hasAttribute('data-aue-prop')) li.append(body);
  return {
    li, logo, name, linkEl, descEls,
  };
}

/** Body scroll lock while a dialog is open (the source sets body overflow hidden). */
function lockScroll(lock) {
  document.body.style.overflow = lock ? 'hidden' : '';
}

/**
 * Builds the card's pop-up: close button, large logo, name, description, link button.
 * The dialog stays in the DOM (closed) so the description remains in the page content.
 */
function buildDialog(card) {
  const {
    li, logo, name, linkEl, descEls,
  } = card;
  const dialog = document.createElement('dialog');
  dialog.className = 'cards-logo-dialog';
  const panel = document.createElement('div');
  panel.className = 'cards-logo-dialog-panel';
  panel.tabIndex = -1; // focus target on open (announces the dialog, no ring on the close button)

  const closeRow = document.createElement('div');
  closeRow.className = 'cards-logo-dialog-close';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'cards-logo-close';
  close.setAttribute('aria-label', 'Close');
  close.append(closeIcon());
  close.addEventListener('click', () => dialog.close());
  closeRow.append(close);
  panel.append(closeRow);

  const img = logo.querySelector('img');
  if (img) {
    const bigLogo = document.createElement('div');
    bigLogo.className = 'cards-logo-dialog-logo';
    // same picture (sources) as the card logo, so the open pop-up reuses the cached image
    const big = (img.closest('picture') || img).cloneNode(true);
    // the copy must not duplicate the card logo's editor instrumentation
    [big, ...big.querySelectorAll('*')].forEach((el) => {
      [...el.attributes].map((attr) => attr.name)
        .filter((n) => n.startsWith('data-aue-') || n.startsWith('data-richtext-'))
        .forEach((n) => el.removeAttribute(n));
    });
    big.querySelectorAll('img').forEach((el) => {
      el.removeAttribute('width');
      el.removeAttribute('height');
    });
    if (big.tagName === 'IMG') {
      big.removeAttribute('width');
      big.removeAttribute('height');
    }
    bigLogo.append(big);
    panel.append(bigLogo);
  }

  const title = document.createElement('p');
  title.className = 'cards-logo-dialog-title';
  title.id = nextId('cards-logo-dialog-title');
  title.textContent = name ? name.textContent.trim() : '';
  if (title.textContent) {
    panel.append(title);
    dialog.setAttribute('aria-labelledby', title.id);
  } else {
    dialog.setAttribute('aria-label', img?.alt || 'Details');
  }

  if (descEls.length) {
    const desc = document.createElement('div');
    desc.className = 'cards-logo-dialog-description';
    desc.append(...descEls);
    panel.append(desc);
  }

  const a = linkEl?.querySelector('a[href]');
  if (a) {
    const cta = document.createElement('p');
    cta.className = 'cards-logo-dialog-cta';
    const btn = document.createElement('a');
    btn.className = 'button accent';
    btn.href = a.href;
    const label = document.createElement('span');
    label.textContent = a.textContent.trim();
    btn.append(label);
    if (isExternal(a.href)) {
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.append(externalIcon());
    }
    cta.append(btn);
    panel.append(cta);
  }

  dialog.append(panel);
  li.append(dialog);

  let opener = null;
  const open = (trigger) => {
    if (dialog.open) return;
    opener = trigger;
    dialog.showModal();
    lockScroll(true);
    panel.focus();
  };
  dialog.addEventListener('close', () => {
    lockScroll(false);
    if (opener && opener.isConnected) opener.focus();
  });
  // Backdrop click: the dialog box itself is only hit outside the panel.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  // Trigger: the name becomes a button (keyboard / AT); the whole card opens it on click.
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'cards-logo-trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  if (name) {
    trigger.append(...name.childNodes);
    name.append(trigger);
  } else {
    trigger.textContent = img?.alt || 'Details';
    trigger.classList.add('cards-logo-trigger-hidden');
    li.querySelector('.cards-logo-body, .cards-logo-image')?.prepend(trigger);
  }
  trigger.addEventListener('click', () => open(trigger));
  li.classList.add('cards-logo-has-dialog');
  li.addEventListener('click', (e) => {
    if (dialog.contains(e.target) || e.target.closest('a, button')) return;
    open(trigger);
  });
}

/** Below 768px: show the first cards only, with a centred Show more / Show less toggle. */
function addShowMore(block, ul) {
  ul.id = ul.id || nextId('cards-logo-list');
  block.classList.add('cards-logo-collapsible');
  const wrap = document.createElement('div');
  wrap.className = 'cards-logo-more';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cards-logo-more-button';
  button.setAttribute('aria-controls', ul.id);
  button.setAttribute('aria-expanded', 'false');
  const label = document.createElement('span');
  label.textContent = 'Show more';
  button.append(label, chevronIcon());
  wrap.append(button);
  ul.after(wrap);
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    label.textContent = expanded ? 'Show less' : 'Show more';
    block.classList.toggle('cards-logo-expanded', expanded);
  });
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  const cards = [...block.children]
    .filter((row) => row.textContent.trim() || row.querySelector('picture')
      || row.hasAttribute('data-aue-resource'))
    .map(buildCard);
  cards.forEach(({ li }) => ul.append(li));

  ul.querySelectorAll('.cards-logo-image picture > img').forEach((img) => {
    const picture = createOptimizedPicture(img.src, img.alt, false, [{ width: '200' }]);
    moveInstrumentation(img, picture.querySelector('img'));
    img.closest('picture').replaceWith(picture);
  });

  if (ul.children.length === 1) block.classList.add('cards-logo-single');
  block.replaceChildren(ul);
  cards.filter((card) => card.descEls.length).forEach(buildDialog);
  if (ul.children.length > MOBILE_VISIBLE) addShowMore(block, ul);
}
