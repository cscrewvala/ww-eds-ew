# carousel-hero

Custom **carousel** block. Purpose: page hero with one or more rotating slides (image or
background video, optional overlay text). Source: `heroBannerCarousel`.

## Authoring (Document Authoring)

Model: `standalone`. One row per slide, two cells:

| Carousel Hero (gradient) | |
|---|---|
| image (for a video slide: its poster) | video link (optional), heading, sub-text, CTA |

- **Video slide**: put a link to the video in the text cell.
  - Scene7: `https://woolworthsgroup.scene7.com/is/content/<company>/<asset>`, played muted and
    looping with the Scene7 SmartCropVideoViewer, as on the source.
  - Or a direct `.mp4` / `.webm` file.
  - With no image, the Scene7 poster (`/is/image/<asset>`) is used.
- The first slide's heading should be the page `h1`; later slides use `h2`.
- One row = a static hero (no arrows or dots). Two or more rows rotate on a timer.

## Page metadata

- `carousel-interval`: seconds between slides (default `6`).

## Supported variations

- Default: light flat scrim.
- `gradient`: transparent-to-black scrim (source `.black--gradient`).
- `no-overlay`: no scrim (source `.teaser.no-opacity`).

## Behaviour

- Rotation holds while the hero is hovered or has keyboard focus, and stops when the tab is
  hidden.
- A pause/play button is shown whenever something moves (several slides or a video).
- With `prefers-reduced-motion`, nothing autoplays until the visitor presses play.
- The video viewer loads after the page `load` event; the poster image is the LCP image.

## Universal Editor fields

N/A (Document Authoring project)
