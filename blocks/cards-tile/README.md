# cards-tile

Custom **cards** block. Purpose: link-tiles.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, one cell of content.

## Supported variations

Authored variation:

- **`cols-2`** (`cards-tile (cols-2)`, source two-50-50 container): 2 columns of up to 572px
  with a 40px gap from 768px. When every tile has a CTA the tiles use the link look with the
  description shown (570x406 image on desktop, 356x173 on mobile, CTA pinned to the bottom);
  long-copy tiles without CTAs keep the text look.

Derived from the content at decoration time:

- **Link tiles** (default): image + title + link-only CTA. Whole tile is clickable (the title
  becomes the stretched primary link). CTA shows on desktop (>= 1025px) only, as on the source.
- **Text tiles** (`cards-tile-text`, added when any tile has descriptive text): 3:2 image,
  title, description and inline CTA (source "mastercard" tiles, e.g. privacy pages).
  Linked titles centre their wrapped lines; tiles with a CTA share one height per row
  and pin the CTA to the bottom (>= 768px).
- **Video tile** (`cards-tile-video`, a link tile whose CTA points at a video, e.g. `.mp4` or
  s7viewers): play icon over the thumbnail, CTA row hidden (its target stays the card link
  and its text is kept for screen readers), 21/28 title on mobile.
- Link-tile images keep their natural aspect ratio (16:9 only reserves space before load).
- **Four up** (`cards-tile-cols-4`, added when the block has exactly 4 tiles): 2 per row
  from 768px, 4 per row from 1440px. Otherwise 3 columns from 768px (2-tile blocks keep
  the 3-column track and leave the last column empty, as on the source).

## Universal Editor fields

N/A (Document Authoring project)
