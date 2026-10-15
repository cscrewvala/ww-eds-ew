/**
 * Fetches the footer fragment. Metadata-independent: /content first (local preview),
 * then the site root (DA/EDS preview + publish).
 * @returns {Promise<{html: string, base: URL}|null>}
 */
async function fetchFooter() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  return { html, base: new URL('.', resp.url || window.location.href) };
}

/**
 * Re-bases relative image paths so they resolve against the fragment location,
 * not the current page.
 */
function rebaseImages(root, base) {
  root.querySelectorAll('img[src], source[srcset]').forEach((el) => {
    const attr = el.tagName === 'IMG' ? 'src' : 'srcset';
    const val = el.getAttribute(attr);
    if (!/^([a-z]+:|\/)/i.test(val)) el.setAttribute(attr, new URL(val, base).href);
  });
}

/** true when an element holds an image and no text */
function isImageOnly(el) {
  return !!el.querySelector('img') && !el.textContent.trim();
}

/** true when a paragraph is a single bold link (EDS button convention) */
function isButtonParagraph(p) {
  const strong = p.querySelector(':scope > strong');
  return p.children.length === 1 && !!strong && strong.children.length === 1
    && strong.firstElementChild.tagName === 'A'
    && p.textContent.trim() === strong.textContent.trim();
}

/** true when a paragraph is bold text only (a label/heading, no link) */
function isLabelParagraph(p) {
  const strong = p.querySelector(':scope > strong');
  return p.children.length === 1 && !!strong && !strong.querySelector('a')
    && p.textContent.trim() === strong.textContent.trim();
}

/** true when a paragraph's only content is a single link */
function isLinkParagraph(p) {
  const a = p.querySelector(':scope > a');
  return p.children.length === 1 && !!a && p.textContent.trim() === a.textContent.trim();
}

/** Tags paragraphs of a column with presentational classes based on their content. */
function decorateParagraphs(column) {
  column.querySelectorAll(':scope > p').forEach((p) => {
    if (isImageOnly(p)) p.classList.add('footer-image');
    else if (isButtonParagraph(p)) {
      p.classList.add('footer-cta');
      p.querySelector('a').classList.add('footer-button');
    } else if (isLabelParagraph(p)) p.classList.add('footer-label');
    else if (isLinkParagraph(p)) p.classList.add('footer-text', 'footer-link-line');
    else p.classList.add('footer-text');
  });
}

/** Builds a column of the main band from one fragment section. */
function buildColumn(section) {
  const col = document.createElement('div');
  col.className = 'footer-column';
  if (section.querySelector('ul, ol')) col.classList.add('footer-links');
  else if (section.querySelector('img')) col.classList.add('footer-brand');
  else col.classList.add('footer-info');
  col.append(...section.childNodes);
  decorateParagraphs(col);
  return col;
}

/**
 * Builds the end-note band (last fragment section): divider, leading mark image,
 * text column; the final paragraph is the copyright line.
 */
function buildEndNote(section) {
  const band = document.createElement('div');
  band.className = 'footer-end-note';
  band.append(document.createElement('hr'));

  const body = document.createElement('div');
  body.className = 'footer-end-note-body';
  const text = document.createElement('div');
  text.className = 'footer-end-note-text';

  [...section.children].forEach((el) => {
    if (isImageOnly(el) && !body.querySelector('.footer-mark')) {
      el.classList.add('footer-mark');
      body.append(el);
    } else {
      text.append(el);
    }
  });
  decorateParagraphs(text);
  const paragraphs = text.querySelectorAll(':scope > p');
  if (paragraphs.length > 1) paragraphs[paragraphs.length - 1].classList.add('footer-copyright');
  body.append(text);
  band.append(body);
  return band;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const fragment = await fetchFooter();
  block.textContent = '';
  if (!fragment) return;

  const tmp = document.createElement('div');
  tmp.innerHTML = fragment.html;
  rebaseImages(tmp, fragment.base);
  const sections = [...tmp.children].filter((el) => el.tagName === 'DIV');
  if (!sections.length) return;

  const inner = document.createElement('div');
  inner.className = 'footer-inner';

  const endNoteSection = sections.length > 1 ? sections.pop() : null;
  const main = document.createElement('div');
  main.className = 'footer-main';
  // adjacent link-list columns share one group (stacked on tablet, side by side on desktop)
  let group = null;
  sections.forEach((section) => {
    const col = buildColumn(section);
    if (!col.classList.contains('footer-links')) {
      group = null;
      main.append(col);
      return;
    }
    col.classList.remove('footer-column');
    if (!group) {
      group = document.createElement('div');
      group.className = 'footer-column footer-link-group';
      main.append(group);
    }
    group.append(col);
  });
  inner.append(main);
  if (endNoteSection) inner.append(buildEndNote(endNoteSection));

  block.append(inner);
}
