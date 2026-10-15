# cards-tile

Custom **cards** block. Purpose: link-tiles.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, one cell of content.

## Supported variations

No authored variations. The look is derived from the content at decoration time:

- **Link tiles** (default): image + title + link-only CTA. Whole tile is clickable (the title
  becomes the stretched primary link). CTA shows on desktop (>= 1025px) only, as on the source.
- **Text tiles** (`cards-tile-text`, added when any tile has descriptive text): 3:2 image,
  title, description and inline CTA (source "mastercard" tiles, e.g. privacy pages).
- **Four up** (`cards-tile-cols-4`, added when the block has exactly 4 tiles): 2 per row
  from 768px, 4 per row from 1440px. Otherwise 3 columns from 768px (2-tile blocks keep
  the 3-column track and leave the last column empty, as on the source).

## Universal Editor fields

N/A (Document Authoring project)
