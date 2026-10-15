# columns-contact

Custom **columns** block. Purpose: contact-details (icon + label + value lines).

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Every non-empty cell is one contact item (one row with an item
per cell, or one item per row). In a cell: label paragraph first (e.g. "Postal address:",
"Phone contact"), then value paragraphs (address lines, `tel:` / `mailto:` links, hours).

An optional leading image / `:icon:` overrides the icon. Otherwise the block picks one
of its bundled source icons from the content:

| Content | Icon |
|---------|------|
| `mailto:` link | `icon-email.svg` (@) |
| `tel:` link, or label mentions phone | `icon-phone.svg` |
| PO Box / Locked Bag / "postal" / "by post", or an unlinked email address | `icon-mailbox.svg` (envelope) |
| Street / state + postcode address text | `icon-location.svg` |

## Layout

Mobile: items stacked, icon above centred text. From 768px: icon left of text;
1 item = single column, 2 items = two 49% columns, 3 items (or 5+) = three columns,
4 items = 2x2 (column-major) in two centred columns.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
