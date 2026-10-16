/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import accordionProgramParser from './parsers/accordion-program.js';
import cardsDocumentsParser from './parsers/cards-documents.js';
import cardsFeaturedParser from './parsers/cards-featured.js';
import cardsLogoParser from './parsers/cards-logo.js';
import cardsProfileParser from './parsers/cards-profile.js';
import cardsStatsParser from './parsers/cards-stats.js';
import cardsTileParser from './parsers/cards-tile.js';
import cardsTimelineParser from './parsers/cards-timeline.js';
import columnsContactParser from './parsers/columns-contact.js';
import columnsGalleryParser from './parsers/columns-gallery.js';
import columnsLogosParser from './parsers/columns-logos.js';
import columnsPanelParser from './parsers/columns-panel.js';
import columnsSpotlightParser from './parsers/columns-spotlight.js';
import columnsTextParser from './parsers/columns-text.js';
import heroArticleParser from './parsers/hero-article.js';
import heroBannerParser from './parsers/hero-banner.js';
import quoteStoryParser from './parsers/quote-story.js';
import videoStoryParser from './parsers/video-story.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/woolworthsgroup-cleanup.js';
import sectionsTransformer from './transformers/woolworthsgroup-sections.js';
import dmImagesTransformer from './transformers/woolworthsgroup-dm-images.js';
import articleMetadataTransformer from './transformers/article-metadata.js';

// PARSER REGISTRY
const parsers = {
  'accordion-program': accordionProgramParser,
  'cards-documents': cardsDocumentsParser,
  'cards-featured': cardsFeaturedParser,
  'cards-logo': cardsLogoParser,
  'cards-profile': cardsProfileParser,
  'cards-stats': cardsStatsParser,
  'cards-tile': cardsTileParser,
  'cards-timeline': cardsTimelineParser,
  'columns-contact': columnsContactParser,
  'columns-gallery': columnsGalleryParser,
  'columns-logos': columnsLogosParser,
  'columns-panel': columnsPanelParser,
  'columns-spotlight': columnsSpotlightParser,
  'columns-text': columnsTextParser,
  'hero-article': heroArticleParser,
  'hero-banner': heroBannerParser,
  'quote-story': quoteStoryParser,
  'video-story': videoStoryParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "content-page",
  "description": "General landing/content pages (AEM content-page-template). Curated (static) content tiles, ecosystem logo grids, leadership-profile cards. Capped at 20.",
  "urls": [
    "https://www.woolworthsgroup.com.au/au/en/who-we-are.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom.html",
    "https://www.woolworthsgroup.com.au/au/en/investors.html",
    "https://www.woolworthsgroup.com.au/au/en/contact-us.html",
    "https://www.woolworthsgroup.com.au/au/en/wiq.html",
    "https://www.woolworthsgroup.com.au/au/en/contact-us/partner-with-us.html",
    "https://www.woolworthsgroup.com.au/au/en/careers/refrigeration-apprenticeship-program.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/diversity-equity-inclusion.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-brands.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-history.html",
    "https://www.woolworthsgroup.com.au/au/en/investors/our-performance/reports.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/reconciliation/reconciliation-at-woolworths-group.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/climate-and-nature.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/health-and-nutrition.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/human-rights.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/social-impact.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/waste-and-circularity.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/board-of-directors.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/management-board.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/climate-and-nature/seafood-sourcing.html"
  ],
  "blocks": [
    {
      "name": "hero-article",
      "instances": [
        "herobannercarousel.heroBannerCarousel:has(.banner--category, .alignLeft__text)"
      ]
    },
    {
      "name": "hero-banner",
      "instances": [
        "herobannercarousel.heroBannerCarousel:not(:has(.banner--category, .alignLeft__text))"
      ]
    },
    {
      "name": "video-story",
      "instances": [
        ".container__body__one-column .wwgvideo:not(.accordion *)",
        ".container__body__two-column:not(:has(.h3-secondary)) .wwgvideo:not(.accordion *)",
        ".container__body__one-column .contenttile:has(.cmp-teaser--tile-video):not(.accordion *)"
      ]
    },
    {
      "name": "quote-story",
      "instances": [
        ".text:has(.cmp-text > blockquote):not(.accordion *)"
      ]
    },
    {
      "name": "cards-tile",
      "instances": [
        ".container__body__content:not(.container__body__one-column):has(.contenttile):not(:has(.contenttile ~ .contenttile)):not(.accordion *)",
        ".container__body__content:not(.container__body__one-column):has(.mastercard .card__primary-img img):not(:has(.heading, .text, .contactpanel)):not(.accordion *)"
      ]
    },
    {
      "name": "cards-featured",
      "instances": [
        ".container__body__content.container__body__two-column:has(.contenttile ~ .contenttile)"
      ]
    },
    {
      "name": "cards-stats",
      "instances": [
        ".heroStats:not(.accordion *)"
      ]
    },
    {
      "name": "accordion-program",
      "instances": [
        ".accordion.panelcontainer:not(.accordion .accordion)"
      ]
    },
    {
      "name": "columns-logos",
      "instances": [
        ".container__body__content.container__body__six-column:has(.image):not(.accordion *)"
      ]
    },
    {
      "name": "columns-spotlight",
      "instances": [
        ".container__body__content.container__body__two-column:has(.h3-secondary):has(.wwgvideo, .mastercard)"
      ]
    },
    {
      "name": "columns-contact",
      "instances": [
        ".container__body__content:has(.contactpanel):not(:has(.mastercard, .heading)):not(.container__body__content *)"
      ]
    },
    {
      "name": "cards-logo",
      "instances": [
        ".ecosystem:not(.ecosystem *)"
      ]
    },
    {
      "name": "columns-text",
      "instances": [
        ".container__body__content.two-50-50:has(.mastercard):not(:has(.card__primary-img img, .image, .h3-secondary, .contactpanel, .wwgvideo))",
        ".container__body__content.container__body__one-column:has(> .container__body__content__cols > .cmp-container > .mastercard .card__title):not(:has(.card__primary-img img, .card__video, .image, .contactpanel, .wwgvideo, .contenttile, .heading, .text))"
      ]
    },
    {
      "name": "columns-panel",
      "instances": [
        ".container__body__content.two-33-66:has(.mastercard):has(.image)"
      ]
    },
    {
      "name": "columns-gallery",
      "instances": [
        ".container__body__content.container__body__three-column:has(.image):not(:has(.button, .contenttile, .mastercard, .heading, .text)):not(.accordion *)"
      ]
    },
    {
      "name": "cards-timeline",
      "instances": [
        ".historytimeline"
      ]
    },
    {
      "name": "cards-documents",
      "instances": [
        ".colscontainer:has(> .container__body > .container__body__content > .container__body__content__cols > .cmp-container > .linklist)"
      ]
    },
    {
      "name": "cards-profile",
      "instances": [
        ".colscontainer:has(.leadershipprofile):not(:has(.text))",
        ".colscontainer:has(.leadershipprofile):has(.text) .container__body__content:has(.leadershipprofile)"
      ]
    }
  ],
  "sections": [
    {
      "id": "1",
      "name": "hero-and-intro",
      "selector": [
        "herobannercarousel.heroBannerCarousel"
      ],
      "style": null,
      "blocks": [
        "hero-article",
        "hero-banner",
        "video-story",
        "cards-stats",
        "columns-gallery",
        "columns-contact",
        "columns-text",
        "cards-logo",
        "cards-timeline"
      ],
      "defaultContent": [
        ".colscontainer .top-cnt > .cmp-container > .heading",
        ".colscontainer .top-cnt > .cmp-container > .text",
        ".colscontainer:not(.container--bg-ocean, [class*=\"container--bg-tint-\"]) .heading",
        ".colscontainer:not(.container--bg-ocean, [class*=\"container--bg-tint-\"]) .text:not(:has(.cmp-text > blockquote))",
        ".colscontainer:not(.container--bg-ocean, [class*=\"container--bg-tint-\"]) div.button",
        ".colscontainer:not(.container--bg-ocean, [class*=\"container--bg-tint-\"]) .container__body__content:has(.button) .image"
      ]
    },
    {
      "id": "2",
      "name": "ocean-band",
      "selector": [
        ".colscontainer.container--bg-ocean:not(.container--bg-ocean + .colscontainer)"
      ],
      "style": "ocean",
      "blocks": [
        "cards-profile"
      ],
      "defaultContent": [
        ".colscontainer.container--bg-ocean .heading",
        ".colscontainer.container--bg-ocean .text:not(:has(.cmp-text > blockquote))",
        ".colscontainer.container--bg-ocean div.button",
        ".colscontainer.container--bg-ocean .container__body__content:has(.button) .image"
      ]
    },
    {
      "id": "3",
      "name": "ocean-band-2",
      "selector": [
        ".colscontainer.container--bg-ocean:not(.container--bg-ocean + .colscontainer) ~ .colscontainer.container--bg-ocean:not(.container--bg-ocean + .colscontainer)"
      ],
      "style": "ocean",
      "blocks": [
        "cards-featured"
      ],
      "defaultContent": [
        ".colscontainer.container--bg-ocean .heading",
        ".colscontainer.container--bg-ocean .text:not(:has(.cmp-text > blockquote))",
        ".colscontainer.container--bg-ocean div.button",
        ".colscontainer.container--bg-ocean .container__body__content:has(.button) .image"
      ]
    },
    {
      "id": "4",
      "name": "tint-sky-10-band",
      "selector": [
        ".colscontainer.container--bg-tint-sky-10:not(.container--bg-tint-sky-10 + .colscontainer)"
      ],
      "style": "tint-sky-10",
      "blocks": [
        "cards-tile",
        "quote-story",
        "accordion-program",
        "columns-panel"
      ],
      "defaultContent": [
        ".colscontainer.container--bg-tint-sky-10 .heading",
        ".colscontainer.container--bg-tint-sky-10 .text:not(:has(.cmp-text > blockquote))",
        ".colscontainer.container--bg-tint-sky-10 div.button",
        ".colscontainer.container--bg-tint-sky-10 .container__body__content:has(.button) .image",
        ".colscontainer.container--bg-tint-sky-10 .newsArticlesButton",
        ".colscontainer.container--bg-tint-sky-10 .container__body__one-column .mastercard"
      ]
    },
    {
      "id": "5",
      "name": "tint-sky-10-band-2",
      "selector": [
        ".colscontainer.container--bg-tint-sky-10:not(.container--bg-tint-sky-10 + .colscontainer) ~ .colscontainer.container--bg-tint-sky-10:not(.container--bg-tint-sky-10 + .colscontainer)"
      ],
      "style": "tint-sky-10",
      "blocks": [],
      "defaultContent": [
        ".colscontainer.container--bg-tint-sky-10 .heading",
        ".colscontainer.container--bg-tint-sky-10 .text:not(:has(.cmp-text > blockquote))",
        ".colscontainer.container--bg-tint-sky-10 div.button",
        ".colscontainer.container--bg-tint-sky-10 .container__body__content:has(.button) .image"
      ]
    },
    {
      "id": "6",
      "name": "tint-sky-5-band",
      "selector": [
        ".colscontainer.container--bg-tint-sky-5:not(.container--bg-tint-sky-5 + .colscontainer)"
      ],
      "style": "tint-sky-5",
      "blocks": [
        "video-story",
        "cards-documents"
      ],
      "defaultContent": [
        ".colscontainer.container--bg-tint-sky-5 .heading",
        ".colscontainer.container--bg-tint-sky-5 .text:not(:has(.cmp-text > blockquote))",
        ".colscontainer.container--bg-tint-sky-5 div.button",
        ".colscontainer.container--bg-tint-sky-5 .container__body__content:has(.button) .image",
        ".colscontainer.container--bg-tint-sky-5 .container__body__two-column .image"
      ]
    },
    {
      "id": "7",
      "name": "tint-sky-5-band-2",
      "selector": [
        ".colscontainer.container--bg-tint-sky-5:not(.container--bg-tint-sky-5 + .colscontainer) ~ .colscontainer.container--bg-tint-sky-5:not(.container--bg-tint-sky-5 + .colscontainer)"
      ],
      "style": "tint-sky-5",
      "blocks": [
        "cards-tile"
      ],
      "defaultContent": [
        ".colscontainer.container--bg-tint-sky-5 .heading",
        ".colscontainer.container--bg-tint-sky-5 .text:not(:has(.cmp-text > blockquote))",
        ".colscontainer.container--bg-tint-sky-5 div.button",
        ".colscontainer.container--bg-tint-sky-5 .container__body__content:has(.button) .image"
      ]
    },
    {
      "id": "8",
      "name": "tint-sky-20-band",
      "selector": [
        ".colscontainer.container--bg-tint-sky-20:not(.container--bg-tint-sky-20 + .colscontainer)"
      ],
      "style": "tint-sky-20",
      "blocks": [
        "cards-tile"
      ],
      "defaultContent": [
        ".colscontainer.container--bg-tint-sky-20 .heading",
        ".colscontainer.container--bg-tint-sky-20 .text:not(:has(.cmp-text > blockquote))",
        ".colscontainer.container--bg-tint-sky-20 div.button",
        ".colscontainer.container--bg-tint-sky-20 .container__body__content:has(.button) .image"
      ]
    },
    {
      "id": "9",
      "name": "footnote-band",
      "selector": [
        ".colscontainer.container--bg-tint-ocean-10:not(.container--bg-tint-ocean-10 + .colscontainer)"
      ],
      "style": "tint-ocean-10",
      "blocks": [],
      "defaultContent": [
        ".colscontainer.container--bg-tint-ocean-10 .text"
      ]
    },
    {
      "id": "10",
      "name": "plain-after-band",
      "selector": [
        ":is(.container--bg-ocean, .container--bg-tint-sky-10, .container--bg-tint-sky-5, .container--bg-tint-sky-20, .container--bg-tint-ocean-10) + .colscontainer:not(.container--bg-ocean, .container--bg-tint-sky-10, .container--bg-tint-sky-5, .container--bg-tint-sky-20, .container--bg-tint-ocean-10)"
      ],
      "style": null,
      "blocks": [
        "video-story",
        "cards-stats",
        "accordion-program",
        "cards-tile",
        "cards-featured",
        "columns-spotlight",
        "columns-contact",
        "cards-logo",
        "cards-documents"
      ],
      "defaultContent": [
        ".colscontainer:not(.container--bg-ocean, [class*=\"container--bg-tint-\"]) .heading",
        ".colscontainer:not(.container--bg-ocean, [class*=\"container--bg-tint-\"]) .text:not(:has(.cmp-text > blockquote))",
        ".colscontainer:not(.container--bg-ocean, [class*=\"container--bg-tint-\"]) div.button",
        ".colscontainer:not(.container--bg-ocean, [class*=\"container--bg-tint-\"]) .container__body__content:has(.button) .image"
      ]
    },
    {
      "id": "11",
      "name": "plain-after-band-2",
      "selector": [
        ":is(.container--bg-ocean, .container--bg-tint-sky-10, .container--bg-tint-sky-5, .container--bg-tint-sky-20, .container--bg-tint-ocean-10) + .colscontainer:not(.container--bg-ocean, .container--bg-tint-sky-10, .container--bg-tint-sky-5, .container--bg-tint-sky-20, .container--bg-tint-ocean-10) ~ :is(.container--bg-ocean, .container--bg-tint-sky-10, .container--bg-tint-sky-5, .container--bg-tint-sky-20, .container--bg-tint-ocean-10) + .colscontainer:not(.container--bg-ocean, .container--bg-tint-sky-10, .container--bg-tint-sky-5, .container--bg-tint-sky-20, .container--bg-tint-ocean-10)"
      ],
      "style": null,
      "blocks": [
        "cards-tile",
        "cards-documents",
        "columns-spotlight",
        "columns-logos"
      ],
      "defaultContent": [
        ".colscontainer:not(.container--bg-ocean, [class*=\"container--bg-tint-\"]) .heading",
        ".colscontainer:not(.container--bg-ocean, [class*=\"container--bg-tint-\"]) .text:not(:has(.cmp-text > blockquote))",
        ".colscontainer:not(.container--bg-ocean, [class*=\"container--bg-tint-\"]) div.button",
        ".colscontainer:not(.container--bg-ocean, [class*=\"container--bg-tint-\"]) .container__body__content:has(.button) .image"
      ]
    }
  ]
};

// TRANSFORMER REGISTRY - cleanup, sections (generic, every template), DM images, then article
// metadata last (it merges into the single Metadata block written by createMetadata)
const transformers = [
  cleanupTransformer,
  sectionsTransformer,
  dmImagesTransformer,
  articleMetadataTransformer,
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  const seen = new Set();
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        if (seen.has(element)) return;
        seen.add(element);
        pageBlocks.push({
          name: blockDef.name, selector, element, section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    // 1. Initial cleanup
    executeTransformers('beforeTransform', main, payload);

    // 2-3. Find and parse blocks (skip elements detached by an earlier parser)
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. Final cleanup, section breaks/metadata, DM images, article metadata
    executeTransformers('afterTransform', main, payload);

    // 5. Built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Path: keep the source IA (/au/en/...), strip .html; root -> /index
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
