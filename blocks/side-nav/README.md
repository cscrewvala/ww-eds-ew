# side-nav

Section navigation rendered from a nav fragment. Purpose: in-section navigation.

## Authoring (Document Authoring)

Normally not authored: `buildAutoBlocks` (scripts/scripts.js) inserts it after the hero section:

| Pages | Fragment | Variant |
| --- | --- | --- |
| `/au/en/investors/...` | `/au/en/investors/nav-section` | `vertical` |
| `/au/en/our-impact/sustainability/...` (not `our-stories/<yyyy>/...` articles) | `/au/en/our-impact/sustainability/nav-section` | `horizontal` |

Manual use: one-cell block table `Side Nav (vertical)` / `Side Nav (horizontal)` holding a link to the fragment.

Fragment content (imported with `tools/importer/import-side-nav.js`): optional heading (nav label/title) and
a list of links; for `vertical`, each top-level item may contain a nested list (a collapsible group).

## Supported variations

- `vertical` (default): title, collapsible groups (button with `aria-expanded`), one group open at a time;
  the group containing the current page opens automatically. Shown at >= 1200px in a 317px left column
  (`body.side-nav-layout`, styles/styles.css); hidden below, as on the source.
- `horizontal`: link bar sticky under the header bar (`--nav-height`), scrolls horizontally when it does not fit.

The current link gets `aria-current="page"` (pathname match, ignoring a leading `/content` and `.html`).
Locally (`/content/...`) the fragment is fetched from `/content${path}` first, then `${path}`.

## Universal Editor fields

N/A (Document Authoring project)
