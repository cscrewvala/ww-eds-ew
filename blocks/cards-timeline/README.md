# cards-timeline

Custom **cards** block. Purpose: company-history-timeline.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, one cell of content.

Rows: `variant | year | title (h3) + paragraphs | image`. The optional first
cell holds the per-row variant `<band>[, right]` (band = `midnight`, `sky` or
`ocean`; `right` puts the card on the right). Without it, bands cycle
midnight/sky/ocean and the card alternates sides. A short paragraph before the
h3 is the milestone date.

## Supported variations

No block-level variations (per-row variant cell, see above).

## Universal Editor fields

N/A (Document Authoring project)
