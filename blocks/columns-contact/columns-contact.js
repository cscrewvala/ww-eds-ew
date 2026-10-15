/**
 * columns-contact: side-by-side icon contact items (address / email / phone).
 * Authoring: every non-empty cell is one item, so either one row with an item per
 * cell or one item per row works. Inside a cell:
 *   - optional icon: an image, or an EDS icon (:location:, :email:, :phone:)
 *   - label: first paragraph/heading (e.g. "Postal address:", "Phone contact")
 *   - value lines: the remaining paragraphs (address lines, tel:/mailto: links, hours)
 * A 2-cell row whose first cell holds only an icon is merged into one item.
 * Items without an authored icon get one inferred from their content
 * (mailto: -> email, tel: -> phone, PO Box / postal -> mailbox, address -> location).
 * @param {Element} block
 */

const ICON_SELECTOR = 'picture, span.icon, img';

const ICON_SIZES = {
  email: [37, 37],
  location: [38, 37],
  mailbox: [32, 32],
  phone: [32, 32],
};

const POSTAL_RE = /\b(p\.?\s?o\.?\s?box|gpo\s+box|locked\s+bag|private\s+bag|postal|by\s+post|mailing\s+address)\b/i;
const EMAIL_TEXT_RE = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const ADDRESS_RE = /\b(street|st|road|rd|way|avenue|ave|drive|dr|lane|level|parade|place|highway|address)\b|\b(nsw|vic|qld|sa|wa|tas|act|nt)\s+\d{4}\b|\b\d{4}\s*$/im;
const PHONE_LABEL_RE = /\b(phone|call|tel(ephone)?)\b/i;

/**
 * Infers the contact type of an item body from its links and text.
 * @param {Element} body
 * @returns {string|null} icon key
 */
function inferType(body) {
  const text = body.textContent;
  if (body.querySelector('a[href^="mailto:"]')) return 'email';
  if (body.querySelector('a[href^="tel:"]')) return 'phone';
  if (POSTAL_RE.test(text)) return 'mailbox';
  // plain-text (unlinked) email addresses use the envelope on the source site
  if (EMAIL_TEXT_RE.test(text)) return 'mailbox';
  if (PHONE_LABEL_RE.test(body.firstElementChild?.textContent || '')) return 'phone';
  if (ADDRESS_RE.test(text)) return 'location';
  return null;
}

function createIcon(type) {
  const [width, height] = ICON_SIZES[type];
  const img = document.createElement('img');
  img.src = `${window.hlx?.codeBasePath || ''}/blocks/columns-contact/icon-${type}.svg`;
  img.alt = '';
  img.width = width;
  img.height = height;
  img.loading = 'lazy';
  img.decoding = 'async';
  return img;
}

function isIconOnly(cell) {
  return cell.querySelector(ICON_SELECTOR) && !cell.textContent.trim();
}

function buildItem(nodes) {
  const li = document.createElement('li');
  const holder = document.createElement('div');
  nodes.forEach((n) => holder.append(...n.childNodes));

  const iconWrap = document.createElement('div');
  iconWrap.className = 'columns-contact-icon';
  const icon = holder.querySelector(ICON_SELECTOR);
  // only a leading icon counts (inline icons inside text stay in place)
  const firstEl = holder.firstElementChild;
  const leading = icon && firstEl && firstEl.contains(icon) && !firstEl.textContent.trim();
  if (leading) {
    const unit = icon.closest('picture') || icon.closest('span.icon') || icon;
    iconWrap.append(unit);
    if (firstEl !== unit && !firstEl.querySelector(ICON_SELECTOR)) firstEl.remove();
  }

  const body = document.createElement('div');
  body.className = 'columns-contact-body';
  [...holder.childNodes].forEach((n) => {
    if (n.nodeType === Node.ELEMENT_NODE) body.append(n);
    else if (n.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = n.textContent.trim();
      body.append(p);
    }
  });
  const label = body.firstElementChild;
  if (label && body.children.length > 1) label.classList.add('columns-contact-label');
  body.querySelectorAll(':scope > p').forEach((p) => {
    const link = p.querySelector('a');
    if (link && p.textContent.trim() === link.textContent.trim()) p.classList.add('columns-contact-link');
  });

  const type = inferType(body);
  if (type) li.classList.add(`columns-contact-${type}`);
  if (!iconWrap.children.length && type) iconWrap.append(createIcon(type));

  if (iconWrap.children.length) li.append(iconWrap);
  else li.classList.add('columns-contact-no-icon');
  li.append(body);
  return li;
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const cells = [...row.children]
      .filter((c) => c.textContent.trim() || c.querySelector(ICON_SELECTOR));
    if (cells.length === 2 && isIconOnly(cells[0])) {
      ul.append(buildItem(cells));
      return;
    }
    cells.forEach((cell) => ul.append(buildItem([cell])));
  });

  const count = ul.children.length;
  // 4 items = 2x2 (two stacked per column, as on the source); 5+ wrap three per row
  const layout = count === 4 ? 4 : Math.min(count, 3);
  block.classList.add(`columns-contact-${layout}-up`);
  block.replaceChildren(ul);
}
