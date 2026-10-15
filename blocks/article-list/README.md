# Article List

Dynamic, filterable listing of articles read from the query index. Replaces the source site's
`newsArticlesDynamic` (Media Releases), `latestNewsDynamic` (News Archive) and `filterTag` +
`contentTile` listings (Our Stories, 100 Years of WWG). Results are never authored by hand:
publishing an article under a `Source` folder adds it to every list that points at that folder.

## Authoring

A two-column key/value table:

| Article List | |
| --- | --- |
| Source | `/au/en/our-newsroom/media-releases/latest-news/` (comma-separate several folders) |
| Filters | any of `category` (or `tags`), `year`, `sort` |
| Tags | optional preset — only articles with all of these tags are listed (e.g. `100 Years`); preset tags still show as chips |
| Categories | optional chip order (comma list, e.g. `Convenience, Australian Community, Products & Value`). Only tags that occur in the listed articles render; tags not in the list follow alphabetically (unlisted preset tags first). Without this row chips are alphabetical with preset tags first |
| Featured | optional list of article paths (comma or line separated, plain text or links) shown first in the authored order; the rest follow by date. Applies to the newest-first view only |
| Limit | page size (default 12) |
| Layout | `news` (image, category, title, date — numbered pages) or `stories` (image, tags, title — Load More) |
| Index | optional index URL (default `/au/en/article-index.json`) |

Only dated article paths (`…/<yyyy>/<slug>`) under `Source` are listed. Sort is by the `date`
column, falling back to the year folder in the path, then `lastModified` (after any `Featured`
paths). Filter state is kept in the URL (`?tag=&year=&sort=&page=`) so filtered views can be
linked; changing page keeps the scroll position, as the source does.

News pagination shows a window of five pages plus the first/last page and `...` gaps from 900px;
below that it is a compact `previous n/N next`. Story tiles are fully clickable (the title link is
stretched over the tile).

## Index

Requires the `articles` index (see `migration-work/query-index-config.yaml`) exposing
`path, title, description, image, date, tags, listing, template, lastModified`. The values come
from page metadata (`Date`, `Tags`, `Listing`, `Template`) written by the importer. An optional
`card-description` column (from `Card Description` metadata) is shown as a two-line teaser on
story tiles; the SEO `description` is never shown.
