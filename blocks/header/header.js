// desktop layout (hover megamenus) starts at this width; below it the hamburger menu is used
const isDesktop = window.matchMedia('(width >= 1200px)');

const SEARCH_PATH = '/au/en/search';
const SEARCH_PARAM = 'q';

const ICON_MENU = '<svg class="nav-hamburger-open" viewBox="0 0 32 32" width="32" height="32" fill="none" aria-hidden="true" focusable="false"><path d="M5.333 24H26.667M5.333 8H26.667M5.333 16H26.667" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_CLOSE = '<svg class="nav-hamburger-close" viewBox="0 0 32 32" width="32" height="32" fill="none" aria-hidden="true" focusable="false"><path d="M8 8L24 24M8 24L24 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_SEARCH = '<svg viewBox="0 0 32 32" width="30" height="30" fill="none" aria-hidden="true" focusable="false"><path d="M28 28L20 20M22.6667 13.3333C22.6667 18.488 18.488 22.6667 13.3333 22.6667C8.17868 22.6667 4 18.488 4 13.3333C4 8.17868 8.17868 4 13.3333 4C18.488 4 22.6667 8.17868 22.6667 13.3333Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_CLEAR = '<svg viewBox="0 0 32 32" width="18" height="18" fill="none" aria-hidden="true" focusable="false"><path d="M13.3333 18.6667L16 16M16 16L18.6667 13.3333M16 16L13.3333 13.3333M16 16L18.6667 18.6667M28 16C28 22.6274 22.6274 28 16 28C9.37258 28 4 22.6274 4 16C4 9.37258 9.37258 4 16 4C22.6274 4 28 9.37258 28 16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * Fetches the nav fragment. Metadata-independent: /content first on local dev
 * (aem up --html-folder content), otherwise the site root (DA/EDS preview + publish).
 * @returns {Promise<{html: string, base: URL}|null>}
 */
async function fetchNav() {
  const local = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  let resp = local ? await fetch('/content/nav.plain.html') : null;
  if (!resp || !resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  return { html, base: new URL('.', resp.url || window.location.href) };
}

/**
 * Re-bases relative image paths so they resolve against the fragment location,
 * not the current page.
 */
function rebaseImages(root, base) {
  root.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (!/^([a-z]+:|\/)/i.test(src)) img.src = new URL(src, base).href;
  });
}

/** true when a paragraph's only content is a single link */
function isLinkParagraph(el) {
  if (el.tagName !== 'P') return false;
  const links = el.querySelectorAll('a');
  return links.length === 1 && el.textContent.trim() === links[0].textContent.trim();
}

/**
 * Splits the nav section into one entry per <h2> (trigger + panel content).
 * @param {Element} section
 */
function parseMenus(section) {
  const menus = [];
  let current = null;
  [...section.children].forEach((el) => {
    if (/^H[1-6]$/.test(el.tagName)) {
      current = {
        heading: el, description: [], cta: null, list: null,
      };
      menus.push(current);
    } else if (!current) {
      // content before the first heading is ignored
    } else if (el.tagName === 'UL' || el.tagName === 'OL') {
      current.list = el;
    } else if (isLinkParagraph(el) && !current.cta) {
      current.cta = el.querySelector('a');
    } else if (el.tagName === 'P' && el.textContent.trim()) {
      current.description.push(el);
    }
  });
  return menus;
}

function closeAllMenus(navSections, except = null) {
  if (!navSections) return;
  navSections.querySelectorAll('.nav-drop').forEach((drop) => {
    if (drop === except) return;
    drop.classList.remove('is-open');
    drop.querySelectorAll('[aria-expanded]').forEach((el) => el.setAttribute('aria-expanded', 'false'));
  });
}

function setMenuOpen(drop, open) {
  drop.classList.toggle('is-open', open);
  drop.querySelectorAll(':scope > [aria-expanded]').forEach((el) => el.setAttribute('aria-expanded', open ? 'true' : 'false'));
}

/**
 * Builds one top-level nav item with its megamenu panel.
 */
function buildMenu(menu, index) {
  const li = document.createElement('li');
  li.className = 'nav-drop';
  const source = menu.heading.querySelector('a');
  const label = menu.heading.textContent.trim();
  const href = source ? source.getAttribute('href') : '#';

  const trigger = document.createElement('a');
  trigger.className = 'nav-drop-trigger';
  trigger.href = href;
  trigger.textContent = label;
  li.append(trigger);

  if (!menu.list && !menu.description.length && !menu.cta) return li;

  const panelId = `nav-mega-${index}`;
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', panelId);

  const panel = document.createElement('div');
  panel.className = 'nav-mega';
  panel.id = panelId;

  const intro = document.createElement('div');
  intro.className = 'nav-mega-intro';
  const title = document.createElement('p');
  title.className = 'nav-mega-title';
  const titleLink = document.createElement('a');
  titleLink.href = href;
  titleLink.textContent = label;
  title.append(titleLink);
  intro.append(title);
  menu.description.forEach((p) => {
    p.className = 'nav-mega-description';
    intro.append(p);
  });
  if (menu.cta) {
    const ctaWrap = document.createElement('p');
    ctaWrap.className = 'nav-mega-cta';
    menu.cta.className = 'nav-mega-button';
    ctaWrap.append(menu.cta);
    intro.append(ctaWrap);
  }
  panel.append(intro);

  if (menu.list) {
    const groups = document.createElement('div');
    groups.className = 'nav-mega-groups';
    [...menu.list.children].forEach((item) => {
      const group = document.createElement('div');
      group.className = 'nav-mega-group';
      // the delivery pipeline wraps an item's own content in <p> when the item has a sub-list
      const itemLabel = item.querySelector(':scope > p') || item;
      const groupLink = itemLabel.querySelector(':scope > a');
      if (groupLink) {
        groupLink.className = 'nav-mega-group-title';
        group.append(groupLink);
      } else {
        const text = [...itemLabel.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent).join('').trim();
        if (text) {
          const span = document.createElement('span');
          span.className = 'nav-mega-group-title';
          span.textContent = text;
          group.append(span);
        }
      }
      const sub = item.querySelector(':scope > ul');
      if (sub) {
        sub.className = 'nav-mega-links';
        // chevron after a real space: it wraps on its own when the label fills the column
        sub.querySelectorAll('a').forEach((a) => {
          const chevron = document.createElement('span');
          chevron.className = 'nav-mega-chevron';
          chevron.setAttribute('aria-hidden', 'true');
          a.append(' ', chevron);
        });
        group.append(sub);
      }
      groups.append(group);
    });
    panel.append(groups);
  }

  // mobile: back button that slides the sub-panel out again
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'nav-mega-back';
  back.innerHTML = '<span>Go back</span>';
  panel.prepend(back);

  // mobile: separate chevron toggle (slides the panel in), the label keeps navigating
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-drop-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', panelId);
  toggle.setAttribute('aria-label', `Show ${label} links`);
  li.append(toggle, panel);

  return li;
}

function bindMenuBehaviour(navSections) {
  navSections.querySelectorAll('.nav-drop').forEach((drop) => {
    if (!drop.querySelector('.nav-mega')) return;
    drop.addEventListener('mouseenter', () => {
      if (!isDesktop.matches) return;
      closeAllMenus(navSections, drop);
      setMenuOpen(drop, true);
    });
    drop.addEventListener('mouseleave', () => {
      if (!isDesktop.matches) return;
      setMenuOpen(drop, false);
    });
    drop.addEventListener('focusin', () => {
      if (!isDesktop.matches) return;
      closeAllMenus(navSections, drop);
      setMenuOpen(drop, true);
    });
    drop.addEventListener('focusout', (e) => {
      if (!isDesktop.matches || drop.contains(e.relatedTarget)) return;
      setMenuOpen(drop, false);
    });
    const toggle = drop.querySelector('.nav-drop-toggle');
    toggle.addEventListener('click', () => {
      const open = !drop.classList.contains('is-open');
      closeAllMenus(navSections, drop);
      setMenuOpen(drop, open);
      if (open && !isDesktop.matches) drop.querySelector('.nav-mega-back')?.focus({ preventScroll: true });
    });
    drop.querySelector('.nav-mega-back')?.addEventListener('click', () => {
      setMenuOpen(drop, false);
      toggle.focus({ preventScroll: true });
    });
  });
}

function buildSearch() {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-search';
  const form = document.createElement('form');
  form.className = 'nav-search-box';
  form.setAttribute('role', 'search');
  form.action = SEARCH_PATH;
  form.method = 'get';

  const input = document.createElement('input');
  input.type = 'text';
  input.name = SEARCH_PARAM;
  input.className = 'nav-search-input';
  input.placeholder = 'Search';
  input.autocomplete = 'off';
  input.setAttribute('aria-label', 'Search');

  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'nav-search-clear';
  clear.setAttribute('aria-label', 'Clear search');
  clear.innerHTML = ICON_CLEAR;

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'nav-search-submit';
  submit.setAttribute('aria-label', 'Submit search');
  submit.innerHTML = ICON_SEARCH;

  const sync = () => form.classList.toggle('has-value', input.value.trim() !== '');
  input.addEventListener('input', sync);
  clear.addEventListener('click', () => {
    input.value = '';
    sync();
    input.focus();
  });
  form.addEventListener('submit', (e) => {
    if (!input.value.trim()) e.preventDefault();
  });

  form.append(input, clear, submit);
  wrapper.append(form);
  return wrapper;
}

function toggleMobileMenu(bar, navSections, force = null) {
  const expanded = bar.getAttribute('aria-expanded') === 'true';
  const open = force !== null ? force : !expanded;
  const button = bar.querySelector('.nav-hamburger button');
  bar.setAttribute('aria-expanded', open ? 'true' : 'false');
  button.setAttribute('aria-expanded', open ? 'true' : 'false');
  button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  document.body.style.overflowY = open && !isDesktop.matches ? 'hidden' : '';
  if (!open) closeAllMenus(navSections);
}

/**
 * loads and decorates the header
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const nav = await fetchNav();
  block.textContent = '';
  if (!nav) return;

  const fragment = document.createElement('div');
  fragment.innerHTML = nav.html;
  rebaseImages(fragment, nav.base);
  const sections = [...fragment.children].filter((el) => el.tagName === 'DIV');

  const brandSection = sections.find((s) => s.querySelector('img')) || sections[0];
  const menuSection = sections.find((s) => s !== brandSection && s.querySelector('h1, h2, h3'));
  const utilitySections = sections.filter((s) => s !== brandSection && s !== menuSection);

  const bar = document.createElement('div');
  bar.className = 'nav-bar';
  bar.id = 'nav';
  bar.setAttribute('aria-expanded', 'false');

  // brand
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  const brandLink = brandSection && brandSection.querySelector('a');
  if (brandLink) {
    brandLink.setAttribute('aria-label', brandLink.querySelector('img')?.alt || brandLink.textContent.trim());
    brand.append(brandLink);
  } else if (brandSection) {
    brand.append(...brandSection.childNodes);
  }
  bar.append(brand);

  // hamburger (mobile)
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav-menu" aria-expanded="false" aria-label="Open navigation">
      ${ICON_MENU}${ICON_CLOSE}
    </button>`;
  bar.append(hamburger);

  // menu + search
  const menuWrapper = document.createElement('div');
  menuWrapper.className = 'nav-menu-wrapper';
  menuWrapper.id = 'nav-menu';
  const navSections = document.createElement('nav');
  navSections.className = 'nav-sections';
  navSections.setAttribute('aria-label', 'Main');
  const list = document.createElement('ul');
  if (menuSection) parseMenus(menuSection).forEach((menu, i) => list.append(buildMenu(menu, i)));
  navSections.append(list);
  menuWrapper.append(navSections, buildSearch());
  bar.append(menuWrapper);

  bindMenuBehaviour(navSections);
  hamburger.querySelector('button').addEventListener('click', () => toggleMobileMenu(bar, navSections));

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    if (navSections.querySelector('.nav-drop.is-open')) closeAllMenus(navSections);
    else if (bar.getAttribute('aria-expanded') === 'true') toggleMobileMenu(bar, navSections, false);
  });

  // reset state when crossing the desktop breakpoint
  isDesktop.addEventListener('change', () => {
    closeAllMenus(navSections);
    toggleMobileMenu(bar, navSections, false);
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(bar);
  block.append(navWrapper);

  // utility strip (share price + investor links)
  utilitySections.forEach((section) => {
    const utility = document.createElement('div');
    utility.className = 'nav-utility';
    utility.append(...section.childNodes);
    const links = [...utility.querySelectorAll('a')];
    // links sharing a destination are long/short label variants of one link:
    // the longest label is shown on wide screens, the shortest on small screens
    const byHref = new Map();
    links.forEach((a) => {
      const key = a.getAttribute('href');
      byHref.set(key, [...(byHref.get(key) || []), a]);
    });
    byHref.forEach((variants) => {
      if (variants.length < 2) return;
      const sorted = [...variants].sort((x, y) => x.textContent.length - y.textContent.length);
      sorted.forEach((a, i) => {
        const item = a.closest('li') || a;
        item.classList.add(i === 0 ? 'nav-utility-compact' : 'nav-utility-wide');
      });
    });
    const primary = links.length > 1 ? links[links.length - 1] : null;
    if (primary) {
      const href = primary.getAttribute('href');
      utility.querySelectorAll('a').forEach((a) => {
        if (a.getAttribute('href') !== href) return;
        a.classList.add('nav-utility-primary');
        a.closest('li')?.classList.add('nav-utility-primary-item');
      });
    }
    block.append(utility);
  });
}
