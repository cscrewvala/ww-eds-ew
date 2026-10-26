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
- `test/ue/check-instrumentation.cjs` — local check that decoration keeps the instrumentation.

## How the instrumentation works

Per block the backend adds `data-aue-resource/type/component/model/label` to the block div
(+ `data-aue-filter` for container blocks). In container blocks every row is an item with its own
resource. Fields: the element matched by each definition `plugins.da.fields[].selector` (CSS on the
source HTML, relative to the block for simple blocks, to the row for items) gets
`data-aue-prop=<field>` and `data-aue-type` text | richtext | media. Key-value blocks
(`"type": "key-value-block"`) instrument the value cell of each row.

Definition `plugins.da`: `name` (block class) and either `rows`/`columns` (+ `fields`),
`unsafeHTML` (starter markup), or `type: key-value-block`. Container block = parent definition with
`filter` + item definition(s) listed in that filter (item id `<block>-item`). Every field in a
definition's `fields` has a model field with the same name. Block options: a `classes` multiselect
or boolean `classes_<name>` fields.

Images in this project come in two forms: `<picture><img src>` and a Scene7 link
`<a href="https://woolworthsgroup.scene7.com/is/image/...">alt</a>` that `scripts/scripts.js`
turns into a picture at runtime (moving the link's instrumentation onto the new `<img>`). Media
cells that usually hold a link model both `image` (reference, `…img[src]`) and `imageLink`
(text, "Image URL (Scene7)", `…a[href*="/is/image/"]`), plus `imageAlt` (`img[alt]`).

## Keeping instrumentation in block code

Decorators that rebuild the DOM must carry the attributes over: import `moveInstrumentation`
from `scripts/scripts.js` and call it when a row becomes an `<li>`/`<details>`/slide, a cell becomes
a new wrapper, an `<img>` is re-created (`createOptimizedPicture`), or text is re-created. Moving
an existing node (append / replaceChildren) keeps its attributes. The block element itself must
stay the same element. Nothing changes when the attributes are absent (normal site).

Editor-only behaviour (open the selected accordion item, show the selected slide, no auto-rotation)
goes in `ue/scripts/ue.js`, using small functions exported by the block. Editor mode is
`document.documentElement.dataset.ue === 'true'` (set by `ue.js` before blocks decorate).

## Adding a block

1. Create `ue/models/blocks/<block>.json` matching the block's authored table (README, decorator,
   real content).
2. Add the block id to the `section` filter in `ue/models/section.json`.
3. Use `moveInstrumentation` where the decorator rebuilds elements.
4. `npm run build:json && node test/ue/check-instrumentation.cjs --block <block> <path>` (local
   preview on :3000): 0 LOST. Rendering without instrumentation must not change.
