/**
 * embed-iframe: third-party widget(s) embedded by URL.
 *
 * Authored rows, one per widget:
 *   cell 1: label (used as the tab label and the iframe title)
 *   cell 2: iframe URL (link or plain text)
 *   cell 3 (optional): height, e.g. "1300" or "1300px"
 *
 * One row  -> a single iframe.
 * >1 rows  -> an accessible tab bar (role=tablist) switching between iframes.
 * Iframes are created lazily: only once the block nears the viewport, and only
 * for a tab when it is first shown.
 */

let instance = 0;

function readUrl(cell) {
  if (!cell) return '';
  const a = cell.querySelector('a[href]');
  const raw = (a ? a.getAttribute('href') : cell.textContent).trim();
  try {
    const url = new URL(raw, window.location.href);
    return /^https?:$/.test(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function readHeight(cell) {
  const m = cell && cell.textContent.trim().match(/^(\d{2,5})\s*(px)?$/i);
  return m ? `${m[1]}px` : '';
}

function parseRows(block) {
  return [...block.children].map((row) => {
    const cells = [...row.children];
    // Tolerate a single-cell row holding just the URL.
    const urlCell = cells.find((c) => readUrl(c) && (c.querySelector('a[href]') || /^https?:\/\//i.test(c.textContent.trim())));
    const url = readUrl(urlCell);
    const labelCell = cells.find((c) => c !== urlCell && c.textContent.trim() && !readHeight(c));
    const heightCell = cells.find((c) => c !== urlCell && readHeight(c));
    return {
      url,
      label: labelCell ? labelCell.textContent.trim() : '',
      height: readHeight(heightCell),
    };
  }).filter((item) => item.url);
}

function buildIframe({ url, label, height }) {
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.title = label || 'Embedded content';
  iframe.loading = 'lazy';
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  if (height) iframe.style.height = height;
  return iframe;
}

function whenNearViewport(block, callback) {
  if (!('IntersectionObserver' in window)) {
    callback();
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      callback();
    }
  }, { rootMargin: '300px' });
  observer.observe(block);
}

export default function decorate(block) {
  const items = parseRows(block);
  block.replaceChildren();
  if (!items.length) return;

  instance += 1;
  const id = `embed-iframe-${instance}`;
  let nearViewport = false;

  const panels = items.map((item, i) => {
    const panel = document.createElement('div');
    panel.className = 'embed-iframe-panel';
    panel.id = `${id}-panel-${i}`;
    if (item.height) panel.style.setProperty('--embed-iframe-height', item.height);
    return panel;
  });

  const ensureLoaded = (i) => {
    if (!nearViewport || panels[i].firstChild) return;
    panels[i].append(buildIframe(items[i]));
  };

  if (items.length === 1) {
    block.append(panels[0]);
    whenNearViewport(block, () => {
      nearViewport = true;
      ensureLoaded(0);
    });
    return;
  }

  block.classList.add('embed-iframe-tabbed');
  const tablist = document.createElement('div');
  tablist.className = 'embed-iframe-tabs';
  tablist.setAttribute('role', 'tablist');

  let active = 0;
  const tabs = items.map((item, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'embed-iframe-tab';
    tab.id = `${id}-tab-${i}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[i].id);
    tab.textContent = item.label || `Tab ${i + 1}`;
    panels[i].setAttribute('role', 'tabpanel');
    panels[i].setAttribute('aria-labelledby', tab.id);
    panels[i].tabIndex = 0;
    return tab;
  });

  const select = (i, focus = false) => {
    active = i;
    tabs.forEach((tab, j) => {
      const on = j === i;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
    });
    ensureLoaded(i);
    if (focus) tabs[i].focus();
  };

  tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)));
  tablist.addEventListener('keydown', (e) => {
    const last = tabs.length - 1;
    const next = {
      ArrowRight: active === last ? 0 : active + 1,
      ArrowLeft: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(next, true);
  });

  tablist.append(...tabs);
  block.append(tablist, ...panels);
  select(0);

  whenNearViewport(block, () => {
    nearViewport = true;
    ensureLoaded(active);
  });
}
