/**
 * columns-logos: a left-aligned, wrapping row of partner / certification logos.
 * Authoring is flexible: one row with a logo per cell, or one logo per row, or
 * several logos in a single cell all work - every logo found in the block becomes
 * one item. A logo may be wrapped in a link (kept), and an optional text-only
 * cell is kept as a caption under the preceding logo.
 * @param {Element} block
 */

function logoUnit(picture) {
  const link = picture.closest('a');
  return link && link.closest('.columns-logos') ? link : picture;
}

export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.querySelectorAll(':scope > div > div')].forEach((cell) => {
    const pictures = [...cell.querySelectorAll('picture')];
    if (!pictures.length) {
      // text-only cell: caption for the previous logo, or a text-only item
      const text = cell.textContent.trim();
      if (!text) return;
      const caption = document.createElement('p');
      caption.className = 'columns-logos-caption';
      caption.append(...cell.childNodes);
      const prev = ul.lastElementChild;
      if (prev && !prev.querySelector('.columns-logos-caption')) prev.append(caption);
      else {
        const li = document.createElement('li');
        li.append(caption);
        ul.append(li);
      }
      return;
    }
    const units = [...new Set(pictures.map(logoUnit))];
    units.forEach((unit) => {
      const li = document.createElement('li');
      const logo = document.createElement('div');
      logo.className = 'columns-logos-logo';
      logo.append(unit);
      li.append(logo);
      ul.append(li);
    });
  });

  block.replaceChildren(ul);
}
