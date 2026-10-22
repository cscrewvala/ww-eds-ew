/* eslint-disable */
/* global WebImporter */

/**
 * Import script: section side/secondary navigation -> flat nav fragment.
 *
 * For a source page, extracts ONLY its section navigation and outputs it as a
 * fragment (optional heading + nested lists of links, no classes/ids) at a
 * custom path, consumed by the side-nav block (auto-blocked in scripts.js):
 *   - investors      (sidenavigation.side-nav-container)        -> /au/en/investors/nav-section
 *   - sustainability (.cmp-secondary-navigation)                 -> /au/en/our-impact/sustainability/nav-section
 *   - who we are     (sidenavigation.side-nav-container)        -> /au/en/who-we-are/nav-section
 *     (source: our-approach-/corporate-governance - the standard "Who we are" menu carried by
 *     the media-page-template pages: profiles, governance, partners, legal disclaimers, AGW)
 *
 * Selector provenance (source DOM, 2026-10):
 *   sidenavigation .side-nav-container__body__heading-container__title  (heading "Investors")
 *   sidenavigation ul.side-menu > li.side-menu-child
 *     > .side-menu-child__p-item > a.side-menu-child__level-1          (group link)
 *     > ul > li > a.side-menu-child__level-2                            (group items)
 *   .cmp-secondary-navigation ul.sec-navigation-list > li > a           (flat bar, no heading)
 *
 * Links follow the migrated IA (same rules as transformers/woolworthsgroup-cleanup.js):
 * strip .html, sanitizePath (lowercase), /au/en -> /, DAM / external links absolute.
 */

const SOURCE_ORIGIN = 'https://www.woolworthsgroup.com.au';
const SOURCE_HOSTS = ['www.woolworthsgroup.com.au', 'woolworthsgroup.com.au'];

const NAV_TARGETS = [
  { prefix: '/au/en/investors/', path: '/au/en/investors/nav-section' },
  { prefix: '/au/en/our-impact/sustainability', path: '/au/en/our-impact/sustainability/nav-section' },
  { prefix: '/au/en/who-we-are/', path: '/au/en/who-we-are/nav-section' },
];

function mapHref(href) {
  let url;
  try {
    url = new URL(href, SOURCE_ORIGIN);
  } catch (e) {
    return href;
  }
  if (!/^https?:$/.test(url.protocol) || !SOURCE_HOSTS.includes(url.hostname)) return url.href;
  let path = url.pathname.replace(/^\/content\/wwg(?=\/au\/)/, '');
  if (path.startsWith('/content/dam/') || path.startsWith('/etc.clientlibs/')) {
    return `${SOURCE_ORIGIN}${path}${url.search}`;
  }
  if (/\.html?$/.test(path)) {
    path = path.replace(/\.html?$/, '');
    if (path === '/au/en' || path === '/au') path = '/';
    else path = WebImporter.FileUtils.sanitizePath(path);
  }
  return `${path}${url.search}${url.hash}`;
}

function text(el) {
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

function link(document, a) {
  const out = document.createElement('a');
  out.href = mapHref(a.getAttribute('href'));
  out.textContent = text(a);
  return out;
}

function list(document, anchors) {
  const ul = document.createElement('ul');
  anchors.forEach((a) => {
    if (!a || !a.getAttribute('href') || !text(a)) return;
    const li = document.createElement('li');
    li.append(link(document, a));
    ul.append(li);
  });
  return ul;
}

/** Vertical side navigation (investors): heading + groups with nested item lists. */
function extractSideNav(document, root) {
  const out = [];
  const title = text(root.querySelector('.side-nav-container__body__heading-container__title'));
  if (title) {
    const h = document.createElement('h2');
    h.textContent = title;
    out.push(h);
  }
  const ul = document.createElement('ul');
  root.querySelectorAll('ul.side-menu > li').forEach((group) => {
    const groupLink = group.querySelector(':scope > .side-menu-child__p-item a, :scope > span a, :scope > a');
    if (!groupLink) return;
    const li = document.createElement('li');
    li.append(link(document, groupLink));
    const items = [...group.querySelectorAll(':scope > ul > li > a')];
    if (items.length) li.append(list(document, items));
    ul.append(li);
  });
  out.push(ul);
  return out;
}

/** Horizontal secondary navigation (sustainability): flat list of links. */
function extractSecondaryNav(document, root) {
  return [list(document, [...root.querySelectorAll('ul > li > a')])];
}

export default {
  transform: (payload) => {
    const { document, params } = payload;
    const sourcePath = new URL(params.originalURL).pathname;
    const target = NAV_TARGETS.find((t) => sourcePath.startsWith(t.prefix));

    const main = document.createElement('div');
    const side = document.querySelector('sidenavigation, [data-component="sideNavigation"]');
    const secondary = document.querySelector('.cmp-secondary-navigation, [data-component="secondaryNavigation"]');
    let kind = 'none';
    if (side) {
      main.append(...extractSideNav(document, side));
      kind = 'side';
    } else if (secondary) {
      main.append(...extractSecondaryNav(document, secondary));
      kind = 'secondary';
    } else {
      console.warn(`No side/secondary navigation found on ${params.originalURL}`);
    }

    const fallback = WebImporter.FileUtils.sanitizePath(`${sourcePath.replace(/\.html?$/, '').replace(/\/[^/]*$/, '')}/nav-section`);
    const path = target ? target.path : fallback;

    return [{
      element: main,
      path,
      report: {
        title: 'nav-section',
        template: 'side-nav',
        navigation: kind,
        links: main.querySelectorAll('a').length,
      },
    }];
  },
};
