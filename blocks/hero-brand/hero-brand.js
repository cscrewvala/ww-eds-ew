import { createOptimizedPicture, moveInstrumentation } from '../../scripts/scripts.js';

/**
 * hero-brand: solid brand band with a logo image + tagline on the left and optional
 * decorative artwork (e.g. swoosh) anchored to the right edge.
 * Authored content (rows/cells may be merged or reordered):
 *   - first image: brand logo, or an icon (:wwg-100-years:) for inline-SVG logos
 *   - second image (optional): decorative artwork, rendered aria-hidden
 *   - text: tagline paragraph(s) and/or a heading
 * @param {Element} block
 */
export default function decorate(block) {
  // Tolerate raw ":icon-name:" text (unprocessed content) by building the icon span ourselves.
  [...block.querySelectorAll(':scope > div > div, :scope > div > div > p')].forEach((el) => {
    if (el.children.length) return;
    const match = el.textContent.trim().match(/^:([a-z0-9-]+):$/i);
    if (!match) return;
    const name = match[1].toLowerCase();
    const span = document.createElement('span');
    span.className = `icon icon-${name}`;
    const img = document.createElement('img');
    img.dataset.iconName = name;
    img.src = `${window.hlx?.codeBasePath || ''}/icons/${name}.svg`;
    img.alt = '';
    span.append(img);
    el.replaceChildren(span);
  });

  const pictures = [...block.querySelectorAll('picture')];

  const content = document.createElement('div');
  content.className = 'hero-brand-content';
  const logo = document.createElement('div');
  logo.className = 'hero-brand-logo';
  const text = document.createElement('div');
  text.className = 'hero-brand-text';

  const optimize = (picture, eager, width) => {
    const img = picture.querySelector('img');
    if (!img) return picture;
    // SVG logos do not benefit from raster renditions.
    if (/\.svg(\?|$)/i.test(img.src)) return picture;
    const optimized = createOptimizedPicture(img.src, img.alt || '', eager, [{ width }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    return optimized;
  };

  // An icon (e.g. :wwg-100-years:) is the logo when the source logo was an inline SVG;
  // every picture is then decorative artwork.
  const iconLogo = block.querySelector('span.icon');
  const [logoPic, artPic] = iconLogo ? [null, pictures[0]] : pictures;
  // Universal Editor: the logo cell's field moves to the logo wrapper
  const logoCell = [...block.querySelectorAll(':scope > div > div')]
    .find((cell) => cell.contains(iconLogo || logoPic || null));
  moveInstrumentation(logoCell, logo);
  if (iconLogo) logo.append(iconLogo);
  else if (logoPic) logo.append(optimize(logoPic, true, '750'));

  let art;
  if (artPic) {
    block.classList.add('has-art');
    art = document.createElement('div');
    art.className = 'hero-brand-art';
    art.setAttribute('aria-hidden', 'true');
    const artOptimized = optimize(artPic, false, '1200');
    const artImg = artOptimized.querySelector('img');
    if (artImg) artImg.alt = '';
    art.append(artOptimized);
  }

  [...block.querySelectorAll(':scope > div > div')].forEach((cell) => {
    // Universal Editor: the tagline cell's field moves to the text wrapper
    if (cell !== logoCell) moveInstrumentation(cell, text);
    if (!cell.children.length) {
      const value = cell.textContent.trim();
      if (value) {
        const p = document.createElement('p');
        p.textContent = value;
        text.append(p);
      }
      return;
    }
    [...cell.children].forEach((child) => {
      if (child.tagName === 'PICTURE') return;
      if (child.querySelector('picture') && !child.textContent.trim()) return;
      if (!child.children.length && !child.textContent.trim()) return;
      text.append(child);
    });
  });

  if (logo.children.length) content.append(logo);
  if (text.children.length) content.append(text);
  if (!logo.children.length) block.classList.add('no-logo');

  const inner = document.createElement('div');
  inner.className = 'hero-brand-inner';
  inner.append(content);

  block.replaceChildren(...(art ? [art] : []), inner);
}
