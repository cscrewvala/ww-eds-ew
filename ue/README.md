# Universal Editor (Author Bus / da.live)

Pages stored in DA can be edited in the Universal Editor (UE). The editor loads them from
`https://<branch>--ww-eds-ew--cscrewvala.ue.da.live/<path>`, which serves the DA content with
`data-aue-*` instrumentation added from the three root files `component-definition.json`,
`component-models.json` and `component-filters.json`. Open that host in the editor canvas, e.g.
`https://experience.adobe.com/#/@<dx-handle>/aem/editor/canvas/main--ww-eds-ew--cscrewvala.ue.da.live/au/en/our-impact/sustainability`.
The published hosts (`*.aem.page`, `*.aem.live`) carry no instrumentation and cannot be edited.

Docs: https://www.aem.live/docs/ew/developing/universal-editor ·
reference implementation: https://github.com/aemsites/da-block-collection (`ue/`).

## Files

- `ue/models/` — sources, one file per block in `ue/models/blocks/<block>.json`
  (`definitions`, `models`, `filters`), plus `section.json`, `page.json`, `text.json`, `image.json`
  and the three templates `component-*.json` that pull them together.
- `npm run build:json` merges them into the root `component-*.json` (commit both).
- `ue/scripts/ue.js` — editor-only behaviour, loaded by `scripts/scripts.js` only on `*.ue.da.live`.
- `test/ue/check-roundtrip.cjs` — simulates a save of every block (must lose nothing, change no rendering).
- `test/ue/check-instrumentation.cjs` — decoration keeps the instrumentation; `--ue-host` also runs
  the editor code path and checks that no inline-editable field could save rendered markup.
- `test/ue/validate-models.cjs` — ids/references/fields consistent, every block in content defined.

## How saving works (the rules that keep content safe)

When any field of a block is saved, the backend **rebuilds the whole block from the definition's
fields**: each field writes its value at its selector path; content no field covers is dropped
(that is how an image link was lost when only the title was edited). So:

1. **One field per cell, covering the whole cell.** Simple blocks: `div:nth-child(<row>)>div` (one
   column) or `div:nth-child(<row>)>div:nth-child(<col>)`; container items (one item per row):
   `div:nth-child(<col>)`. Use `richtext` for any cell that holds markup (images, links, headings,
   lists), `text` only for plain-text cells. The value is then the cell's complete HTML, whatever its
   shape (a bare `<a>`, a DA-normalised `<p><a>`, a `<picture>`), so nothing can be dropped.
2. **Plain child paths only** (`>` and `:nth-child(n)`); no descendant combinators, attribute value
   filters, `:not`, `:has`. A trailing `[attr]` names the attribute to write, it is not a filter.
3. **Size the fields to the block's largest shape** (most rows/cells used in content). A save pads
   smaller instances with empty cells/rows, so decorators must treat empty cells/rows as absent
   (see table-data, columns-text, search, cards-stats).
4. **Block options:** the `classes` multiselect must list every class used on the block in content,
   or a save drops it.
5. Key-value blocks (`"type": "key-value-block"`) only where every row key is a known field
   (article-list); free-form label|value rows (search categories) are container items instead.

Images in this project are mostly Scene7 links (`<a href="…/is/image/…">alt</a>`, turned into a
picture at runtime). In the editor an image cell is a rich-text field: change the image by editing
the link URL (Scene7 or AEM Assets delivery URL), the link text is the alt text. An AEM asset picker
(`reference`) field cannot represent a link and would wipe it, so it is not used.

## Inline (canvas) editing guard

The editor saves an inline edit from the element's **rendered** HTML. `scripts/scripts.js`
snapshots every field's authored content before decoration; `ue/scripts/ue.js` keeps a field
editable on the canvas only while its decorated element still holds exactly that content. Fields a
block restructured (pictures built from links, wrappers, runtime classes, buttons) are edited in the
properties panel, which works on the stored source. Block code should therefore avoid adding classes
or markup inside cells it wants editable inline (hero-article styles its label structurally).

## Keeping instrumentation in block code

Decorators that rebuild the DOM carry the attributes over with `moveInstrumentation` from
`scripts/scripts.js` (row -> `<li>`/`<details>`/slide, cell -> wrapper, re-created `<img>`).
Moving an existing node keeps its attributes. The block element itself must stay the same element.
Nothing changes when the attributes are absent (normal site).

Editor-only behaviour (open the selected accordion item, show the selected slide, no auto-rotation)
goes in `ue/scripts/ue.js`, using small functions exported by the block. Editor mode is
`document.documentElement.dataset.ue === 'true'` (set by `scripts.js` before blocks decorate).

## Adding or changing a block

1. Create `ue/models/blocks/<block>.json` following the rules above (look at the real content:
   rows, cells, classes).
2. Add the block id to the `section` filter in `ue/models/section.json`.
3. `npm run build:json`, then with the local preview on :3000:
   `node test/ue/validate-models.cjs`,
   `node test/ue/check-roundtrip.cjs --block <block> <paths…>` (0 lost, 0 rendering changes),
   `node test/ue/check-instrumentation.cjs --ue-host --block <block> <paths…>` (0 lost, 0 unsafe).
