/**
 * modal-terms: terms-of-use gate shown in a modal dialog on page load.
 *
 * Authored as one row (cells tolerated in any number):
 *   cell 1: optional alert label (e.g. "General information"), heading, legal rich text
 *   cell 2: the actions, e.g. "Decline" (optionally a link, e.g. /investors) and
 *           "Accept and Continue"
 *
 * Accept  -> stores consent in sessionStorage (per page path) and closes the dialog.
 * Decline -> navigates to the authored Decline link if present, else history.back()
 *            (falling back to the site root when there is no history).
 * When consent is already stored for this session, the gate is not shown.
 */

const ACCEPT_RE = /\b(accept|agree|continue|proceed|yes)\b/i;
const DECLINE_RE = /\b(decline|disagree|cancel|reject|no|go back)\b/i;

function storageKey() {
  return `modal-terms-accepted:${window.location.pathname}`;
}

function hasConsent() {
  try {
    return window.sessionStorage.getItem(storageKey()) === 'true';
  } catch {
    return false;
  }
}

function storeConsent() {
  try {
    window.sessionStorage.setItem(storageKey(), 'true');
  } catch {
    // storage unavailable (e.g. privacy mode): consent lasts for this page view only
  }
}

/** Collect candidate action elements (links, or short text-only paragraphs). */
function findActions(block) {
  // Actions live in the cells after the content cell; with a single cell, search it all.
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const scopes = cells.length > 1 ? cells.slice(1) : [block];
  const candidates = [];
  scopes.flatMap((scope) => [...scope.querySelectorAll('a, p, li, strong, em')]).forEach((el) => {
    const text = el.textContent.trim();
    if (!text || text.length > 40) return;
    if (el.tagName !== 'A' && el.querySelector('a')) return; // the link itself is the candidate
    if (el.tagName !== 'A' && candidates.some((c) => c.el.contains(el) || el.contains(c.el))) return;
    candidates.push({ el, text });
  });
  const accept = candidates.find((c) => ACCEPT_RE.test(c.text) && !/decline/i.test(c.text));
  const declineCandidate = candidates.find((c) => c !== accept && DECLINE_RE.test(c.text));
  return { accept, decline: declineCandidate };
}

/** Remove an action element and any wrapper it leaves empty, up to the cell. */
function detach(el, stop) {
  let node = el;
  while (node.parentElement && node.parentElement !== stop
    && node.parentElement.textContent.trim() === node.textContent.trim()) {
    node = node.parentElement;
  }
  node.remove();
}

function decline(href) {
  if (href) {
    window.location.href = href;
  } else if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = '/';
  }
}

/**
 * Universal Editor: the gate would cover the page and its content would live outside the
 * block, so in the editor the authored cells stay in place, shown inline (no dialog).
 * @param {Element} block
 * @returns {boolean} true when rendering for the editor
 */
export function isEditing(block) {
  return document.documentElement.dataset.ue === 'true' || block.hasAttribute('data-aue-resource');
}

export default function decorate(block) {
  if (isEditing(block)) {
    block.classList.add('modal-terms-inline');
    return;
  }
  const { accept, decline: declineAction } = findActions(block);
  const declineHref = declineAction && declineAction.el.tagName === 'A'
    ? declineAction.el.getAttribute('href') : '';
  const acceptLabel = accept ? accept.text : 'Accept and Continue';
  const declineLabel = declineAction ? declineAction.text : 'Decline';
  [accept, declineAction].forEach((a) => { if (a) detach(a.el, block); });

  // Everything left is the dialog body.
  const content = document.createElement('div');
  content.className = 'modal-terms-content';
  [...block.querySelectorAll(':scope > div > div')].forEach((cell) => {
    while (cell.firstChild) content.append(cell.firstChild);
  });
  [...content.children].forEach((el) => { if (!el.textContent.trim() && !el.querySelector('img')) el.remove(); });
  block.replaceChildren();
  block.hidden = true;

  if (hasConsent()) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'modal-terms-dialog';
  const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    // short text before the heading is the optional alert label (e.g. "General information")
    let prev = heading.previousElementSibling;
    while (prev) {
      if (prev.textContent.trim().length <= 60) prev.classList.add('modal-terms-alert');
      prev = prev.previousElementSibling;
    }
    heading.id = heading.id || 'modal-terms-title';
    dialog.setAttribute('aria-labelledby', heading.id);
  } else {
    dialog.setAttribute('aria-label', 'Terms of use');
  }
  content.tabIndex = 0; // scrollable region must be keyboard reachable

  const actions = document.createElement('div');
  actions.className = 'modal-terms-actions';

  const declineBtn = document.createElement('button');
  declineBtn.type = 'button';
  declineBtn.className = 'button secondary modal-terms-decline';
  declineBtn.textContent = declineLabel;

  const acceptBtn = document.createElement('button');
  acceptBtn.type = 'button';
  acceptBtn.className = 'button modal-terms-accept';
  acceptBtn.textContent = acceptLabel;

  actions.append(declineBtn, acceptBtn);
  dialog.append(content, actions);
  document.body.append(dialog);

  const root = document.documentElement;
  const previousOverflow = root.style.overflow;
  const close = () => {
    root.style.overflow = previousOverflow;
    dialog.close();
    dialog.remove();
  };

  acceptBtn.addEventListener('click', () => {
    storeConsent();
    close();
  });
  declineBtn.addEventListener('click', () => decline(declineHref));
  // The gate requires an explicit choice: Escape does not dismiss it.
  dialog.addEventListener('cancel', (e) => e.preventDefault());

  root.style.overflow = 'hidden';
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  // Start focus at the top of the dialog so the terms are read before the choice
  // (Tab then reaches the text panel, Decline and Accept).
  dialog.tabIndex = -1;
  dialog.focus({ preventScroll: true });
}
