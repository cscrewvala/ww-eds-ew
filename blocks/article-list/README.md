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
| Tags | optional preset — only articles with all of these tags are listed (e.g. `100 Years`) |
| Limit | page size (default 12) |
| Layout | `news` (image, category, title, date — numbered pages) or `stories` (image, tags, title — Load More) |
| Index | optional index URL (default `/au/en/article-index.json`) |

Only dated article paths (`…/<yyyy>/<slug>`) under `Source` are listed. Sort is by the `date`
column, falling back to the year folder in the path, then `lastModified`. Filter state is kept in
the URL (`?tag=&year=&sort=&page=`) so filtered views can be linked.

## Index

Requires the `articles` index (see `migration-work/query-index-config.yaml`) exposing
`path, title, description, image, date, tags, listing, template, lastModified`. The values come
from page metadata (`Date`, `Tags`, `Listing`, `Template`) written by the importer.
