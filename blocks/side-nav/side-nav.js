// eslint-disable-next-line import/no-cycle
import { loadFragment } from '../fragment/fragment.js';

const CHEVRON = '<svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" focusable="false">'
  + '<path fill="currentColor" d="M3 11.7284L13.3133 22.0277C14.0253 22.7363 14.989 23.1342 15.9935 23.1342C16.998 23.1342 17.9617 22.7363 18.6737 22.0277L29 11.7165L26.7022 9.4231L16.377 19.7332C16.2754 19.8347 16.1377 19.8918 15.994 19.8918C15.8504 19.8918 15.7127 19.8347 15.6111 19.7332L5.29775 9.43501L3 11.7284Z"/></svg>';

/**
 * Normalises a path for current-page matching: drops the local-preview /content prefix,
 * .html extension and trailing slash.
 * @param {string} path
 * @returns {string}
 */
function normalizePath(path) {
  const p = (path || '')
    .replace(/^\/content(?=\/)/, '')
    .replace(/\.html?$/, '')
    .replace(/\/+$/, '')
    .toLowerCase();
  return p || '/';
}

function linkPath(a) {
  try {
    const url = new URL(a.getAttribute('href'), window.location.href);
    if (url.origin !== window.location.origin) return null;
    return normalizePath(url.pathname);
  } catch {
    return null;
  }
}

/**
 * Loads the nav fragment. Local preview serves imported content under /content,
 * so try `/content${path}` first there, then the path as authored.
 * @param {string} path fragment path
 * @returns {Promise<HTMLElement|null>}
 */
async function loadNavFragment(path) {
  const candidates = [];
  if (window.location.pathname.startsWith('/content/') && !path.startsWith('/content/')) {
    candidates.push(`/content${path}`);
  }
  candidates.push(path);
  for (let i = 0; i < candidates.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const fragment = await loadFragment(candidates[i]);
    if (fragment) return fragment;
  }
  return null;
}

function cleanLink(a) {
  const link = document.createElement('a');
  link.href = a.getAttribute('href');
  link.textContent = a.textContent.trim();
  return link;
}

function markCurrent(link, current) {
  if (linkPath(link) === current) {
    link.setAttribute('aria-current', 'page');
    return true;
  }
  return false;
}

function buildVertical(nav, heading, list, current) {
  if (heading) {
    const title = document.createElement('p');
    title.className = 'side-nav-title';
    title.textContent = heading.textContent.trim();
    nav.append(title);
  }

  const groups = document.createElement('ul');
  groups.className = 'side-nav-groups';
  const toggles = [];
  let openIndex = -1;
  let prefixIndex = -1;
  let prefixLength = 0;

  [...list.children].filter((li) => li.tagName === 'LI').forEach((item, index) => {
    const anchor = item.querySelector(':scope > a, :scope > p > a, :scope > strong > a, :scope > p > strong > a');
    const subList = item.querySelector(':scope > ul');
    if (!anchor) return;

    const li = document.createElement('li');
    li.className = 'side-nav-group';
    const head = document.createElement('div');
    head.className = 'side-nav-group-head';
    const groupLink = cleanLink(anchor);
    head.append(groupLink);
    li.append(head);
    if (markCurrent(groupLink, current)) openIndex = index;

    const groupPath = linkPath(groupLink);
    if (groupPath && groupPath !== '/' && current.startsWith(`${groupPath}/`) && groupPath.length > prefixLength) {
      prefixIndex = index;
      prefixLength = groupPath.length;
    }

    const links = subList ? [...subList.querySelectorAll(':scope > li > a, :scope > li > p > a')] : [];
    if (links.length) {
      const id = `side-nav-group-${index + 1}`;
      const ul = document.createElement('ul');
      ul.className = 'side-nav-items';
      ul.id = id;
      links.forEach((a) => {
        const subLi = document.createElement('li');
        const link = cleanLink(a);
        if (markCurrent(link, current)) openIndex = index;
        subLi.append(link);
        ul.append(subLi);
      });

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'side-nav-toggle';
      button.setAttribute('aria-controls', id);
      button.setAttribute('aria-label', groupLink.textContent);
      button.innerHTML = CHEVRON;
      head.append(button);
      li.append(ul);
      li.classList.add('has-items');
      toggles[index] = { li, button, ul };
    }
    groups.append(li);
  });

  const setOpen = (target) => {
    toggles.forEach((t, i) => {
      if (!t) return;
      const open = i === target;
      t.li.classList.toggle('is-open', open);
      t.button.setAttribute('aria-expanded', open);
      t.ul.hidden = !open;
    });
  };

  toggles.forEach((t, i) => {
    if (!t) return;
    t.button.addEventListener('click', () => {
      setOpen(t.button.getAttribute('aria-expanded') === 'true' ? -1 : i);
    });
  });

  setOpen(openIndex >= 0 ? openIndex : prefixIndex);
  nav.append(groups);
}

function buildHorizontal(nav, list, current) {
  const ul = document.createElement('ul');
  ul.className = 'side-nav-items';
  let active = null;
  list.querySelectorAll('a').forEach((a) => {
    const li = document.createElement('li');
    const link = cleanLink(a);
    if (!active && markCurrent(link, current)) active = link;
    li.append(link);
    ul.append(li);
  });
  nav.append(ul);
  return active;
}

/**
 * Side navigation, rendered from a nav fragment (heading + nested lists of links).
 * Variants: `vertical` (default, collapsible groups) and `horizontal` (sticky bar).
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const horizontal = block.classList.contains('horizontal');
  if (!horizontal) block.classList.add('vertical');

  const anchor = block.querySelector('a[href]');
  let path = anchor ? anchor.getAttribute('href') : block.textContent.trim();
  try {
    path = new URL(path, window.location.href).pathname;
  } catch {
    path = '';
  }
  block.textContent = '';
  if (!path) return;

  const fragment = await loadNavFragment(path.replace(/\.plain\.html$|\.html$/, ''));
  const list = fragment && fragment.querySelector('ul');
  if (!list) {
    block.closest('.section')?.classList.add('side-nav-empty');
    return;
  }
  const heading = fragment.querySelector('h1, h2, h3, h4, h5, h6');
  const current = normalizePath(window.location.pathname);

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', heading ? heading.textContent.trim() : 'Section navigation');

  if (horizontal) {
    const active = buildHorizontal(nav, list, current);
    block.append(nav);
    if (active) {
      // reveal the current link inside the horizontally scrolling bar (no page scroll);
      // wait for web fonts so item widths are final
      const reveal = () => {
        const scroller = nav.querySelector('ul');
        const li = active.parentElement; // offsets relative to ul (position: relative)
        if (li.offsetLeft + li.offsetWidth > scroller.scrollLeft + scroller.clientWidth) {
          scroller.scrollLeft = li.offsetLeft + li.offsetWidth - scroller.clientWidth;
        }
      };
      const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
      fontsReady.then(() => requestAnimationFrame(reveal));
    }
  } else {
    buildVertical(nav, heading, list, current);
    block.append(nav);
  }
}
