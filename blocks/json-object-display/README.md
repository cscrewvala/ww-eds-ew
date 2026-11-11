# json-object-display

Fetches an **EDS-published JSON object** (a da.live spreadsheet published to
`.json`) and renders selected key/value pairs with a configurable visual style.
Used in the nav to show the Woolworths Group share price bar.

## Authoring

Add a table to the document. First row = block name. Then:

| Row (cell 1) | Cell 2 | Cell 3 | Meaning |
|---|---|---|---|
| `source` | JSON path or URL | — | Optional. JSON endpoint. Default `/stock-price.json` |
| `style`  | style name | — | Optional. Visual style. Default `nav` |
| display label | json key | suffix/unit *(optional)* | A value to display |

- `source` and `style` are reserved config rows.
- Every other row is a display mapping: **cell 1** is the label shown to the
  user, **cell 2** is the key read from the JSON, **cell 3** is an optional
  unit/suffix appended after the value (`%` is attached with no space, any
  other unit gets a space).
- The style can also be authored as a block variant, e.g.
  `json-object-display (nav)`. A `style` row wins over a variant.
- `source` may be a relative path (`/stock-price.json`) or a pasted link. Links
  to this site or any `*.aem.page` / `*.aem.live` host are made relative, so the
  same content works on local, branch, preview, live and production hosts.

### Woolworths Group nav example

| json-object-display |                   |     |
|---------------------|-------------------|-----|
| source              | /stock-price.json |     |
| style               | nav               |     |
| Share price         | price             | AUD |
| High                | high              |     |
| Low                 | low               |     |
| Change              | change            | %   |

Renders: `Share price 41.95 AUD │ High 42.73   Low 42.08   Change -0.92%`
on a dark navy bar with white text.

## JSON formats supported

The block normalizes the common EDS/da.live shapes automatically:

1. **Columns-as-keys** (one data row): `{ "data": [{ "price": "41.94", "high": "42.47" }] }`
2. **key/value columns**: `{ "data": [{ "key": "price", "value": "41.94" }, ...] }`
3. Plain object or array of objects.

## Adding a new style

Add a `.json-object-display.<name>` ruleset in the CSS, then author that name in
the block's `style` row (or as a variant). The JS adds the style name as a CSS
class on the block.

## Behaviour notes

- The `nav` style makes the first item smaller and adds a vertical divider after it (per design).
- Rows whose key is missing or empty in the JSON are not rendered.
- If the fetch fails or nothing matches, the block is hidden and the error is
  logged to the console, so the page never shows labels without values.
- Values display exactly as stored in the JSON (plus optional suffix), so
  number formatting should live in the spreadsheet.
