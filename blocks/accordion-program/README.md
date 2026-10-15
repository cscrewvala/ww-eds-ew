# accordion-program

Custom **accordion** block. Purpose: program-details-disclosure.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. One row per item: cell 1 label, cell 2 rich body.

Inside a body, a bulleted list where every item is a single bare link
(`<li><a>`) renders as a document link list: pdf / video / file / link icon
(same icons as `cards-documents`), single-line truncated link with a hover
tooltip. A heading directly before such a list (e.g. a month) becomes its title.
A paragraph starting `(1) ` is rendered as small-print footnote, and matching
`(1)` markers in the text are shrunk.
Runs of consecutive image-only paragraphs become an image grid (1 column on
mobile, 3 x 356px max with a 16px gap from 600px, 16px radius). Tables get a 1px
black grid with 8px 12px cell padding and scroll horizontally when too wide.

Inside a `narrow` section the accordion is inset 16px (18px from 1200px) from
the body copy. When it follows default content in the same section, it starts
64px below that copy.

## Supported variations

- `open-first`: the first item is open on load (investor accordions).
- `berry-bullets` (alias `bullets-berry`): plain (non-link) bullet lists use
  10px berry dot bullets (source `.custom-bullets--berry`, dividends DRP panels).
- `inset`: panel content is inset 31px (44px from 900px), matching source panels
  that wrap their content in an inner container.

## Universal Editor fields

N/A (Document Authoring project)
