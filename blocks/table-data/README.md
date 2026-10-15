# table-data

Custom **table** block. Purpose: data-table.

## Authoring (Document Authoring)

Model: `standalone`

First row = column headers, following rows = data. Cells may contain links.

## Supported variations

- *(default / `list`)*: borderless rows with light ocean rules, link icon on cells that contain a link (source `tableComp`, e.g. webcasts). Below 768px each row stacks into a labelled card (first cell as a dark title bar, other cells as `Header: value`).
- `bordered`: plain 1px ruled grid, shrink-to-fit width like the source RTE tables (e.g. dividend history, health-and-nutrition metrics). Wider tables scroll horizontally.

If no variation is authored, tables with no links in the data rows render as `bordered`; add `(list)` or `(bordered)` to force a style.

## Universal Editor fields

N/A (Document Authoring project)
