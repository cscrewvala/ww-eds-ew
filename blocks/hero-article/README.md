# hero-article

Custom **hero** block. Purpose: article-hero.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, one cell of content.

## Supported variations

- Default: flat 60% black overlay (source `.heroBanner.teaser`), image anchored left-centre at >=768px.
- `gradient`: transparent-to-black overlay (source `.black--gradient`: privacy, sustainability, D&I, careers).
- `no-overlay`: no scrim (source `.teaser.no-opacity`, e.g. contact-us).
- `top` / `bottom` / `right`: image anchor at >=768px (source `.position__obj--top|--bottom`, inline 50% 0 / 100% 50%).
- `subtitle`: title came from `p.p--subText.h3` (no `h2.hero`); 27/32 mobile, 36/44 at >=768px.
- An `h3` after the title in the content cell renders as the source `.p--subText.h3` sub-line.

## Universal Editor fields

N/A (Document Authoring project)
