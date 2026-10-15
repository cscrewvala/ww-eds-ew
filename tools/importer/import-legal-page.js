/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import accordionProgramParser from './parsers/accordion-program.js';
import cardsLogoParser from './parsers/cards-logo.js';
import cardsResourceParser from './parsers/cards-resource.js';
import cardsTileParser from './parsers/cards-tile.js';
import columnsMediaParser from './parsers/columns-media.js';
import columnsSpotlightParser from './parsers/columns-spotlight.js';
import columnsTextParser from './parsers/columns-text.js';
import embedIframeParser from './parsers/embed-iframe.js';
import heroArticleParser from './parsers/hero-article.js';
import videoStoryParser from './parsers/video-story.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/woolworthsgroup-cleanup.js';
import sectionsTransformer from './transformers/woolworthsgroup-sections.js';
import dmImagesTransformer from './transformers/woolworthsgroup-dm-images.js';
import articleMetadataTransformer from './transformers/article-metadata.js';

// PARSER REGISTRY
const parsers = {
  'accordion-program': accordionProgramParser,
  'cards-logo': cardsLogoParser,
  'cards-resource': cardsResourceParser,
  'cards-tile': cardsTileParser,
  'columns-media': columnsMediaParser,
  'columns-spotlight': columnsSpotlightParser,
  'columns-text': columnsTextParser,
  'embed-iframe': embedIframeParser,
  'hero-article': heroArticleParser,
  'video-story': videoStoryParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "legal-page",
  "description": "Privacy, policy and legal statement pages (AEM blank-page-template).",
  "urls": [
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-approach-/corporate-governance/safety-health-and-wellbeing-policy.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-approach-/corporate-governance/recovery-and-return-to-work-policy.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/reconciliation/our-artwork.html",
    "https://www.woolworthsgroup.com.au/au/en/privacy.html",
    "https://www.woolworthsgroup.com.au/au/en/privacy/policy-documents/privacy-policy.html",
    "https://www.woolworthsgroup.com.au/au/en/privacy/collection.html",
    "https://www.woolworthsgroup.com.au/au/en/privacy/cookies-and-digital-identifiers.html",
    "https://www.woolworthsgroup.com.au/au/en/privacy/usage.html",
    "https://www.woolworthsgroup.com.au/au/en/privacy/managing-your-information.html",
    "https://www.woolworthsgroup.com.au/au/en/privacy/policy-documents.html",
    "https://www.woolworthsgroup.com.au/au/en/privacy/policy-documents/cookies-statement.html",
    "https://www.woolworthsgroup.com.au/au/en/privacy/sharing.html",
    "https://www.woolworthsgroup.com.au/au/en/privacy/in-store-technology-and-your-privacy.html",
    "https://www.woolworthsgroup.com.au/au/en/privacy/protection.html",
    "https://www.woolworthsgroup.com.au/au/en/privacy/policy-documents/terms-and-conditions.html",
    "https://www.woolworthsgroup.com.au/au/en/woolworths-captive-insurance-pte--ltd-statement.html"
  ],
  "blocks": [
    {
      "name": "hero-article",
      "instances": [
        "herobannercarousel.heroBannerCarousel:has(.banner--category)"
      ]
    },
    {
      "name": "cards-tile",
      "instances": [
        ".container__body__content:is(.container__body__three-column, .container__body__four-column):has(> .container__body__content__cols > .cmp-container > .mastercard .card__primary-img img)"
      ]
    },
    {
      "name": "cards-logo",
      "instances": [
        ".ecosystem:not(.ecosystem *)"
      ]
    },
    {
      "name": "embed-iframe",
      "instances": [
        ".embed-iframe.embed:has(iframe)"
      ]
    },
    {
      "name": "accordion-program",
      "instances": [
        ".accordion.panelcontainer:not(.accordion .accordion)"
      ]
    },
    {
      "name": "columns-text",
      "instances": [
        ".container__body__content.container__body__three-column:has(> .container__body__content__cols > .cmp-container > .mastercard .card__title):not(:has(.card__primary-img, .card__video))"
      ]
    },
    {
      "name": "columns-spotlight",
      "instances": [
        "imagevideotext.dual-container"
      ]
    },
    {
      "name": "video-story",
      "instances": [
        ".mastercard:has(.card__video)"
      ]
    },
    {
      "name": "cards-resource",
      "instances": [
        ".container__body__content.container__body__three-column:has(> .container__body__content__cols > .cmp-container > smallmediacard.small-media-card)",
        ".container__body__content__cols:has(> .cmp-container > .policydocument)"
      ]
    },
    {
      "name": "columns-media",
      "instances": [
        ".container__body__content.container__body__two-column.two-50-50:has(.image):has(.text)"
      ]
    }
  ],
  "sections": [
    {
      "id": "1",
      "name": "hero",
      "selector": [
        "herobannercarousel.heroBannerCarousel"
      ],
      "style": null,
      "blocks": [
        "hero-article"
      ],
      "defaultContent": []
    },
    {
      "id": "v1",
      "name": "ocean-title-band",
      "selector": [
        ".colscontainer.container--bg-ocean"
      ],
      "style": "ocean",
      "blocks": [
        "cards-resource"
      ],
      "defaultContent": [
        ".text.welcome-banner",
        ".heading",
        ".text"
      ]
    },
    {
      "id": "2",
      "name": "intro",
      "selector": [
        "herobannercarousel.heroBannerCarousel + .colscontainer:not([class*='container--bg'])"
      ],
      "style": null,
      "blocks": [
        "columns-media",
        "cards-tile"
      ],
      "defaultContent": [
        ".text",
        ".heading",
        ".button",
        ".image"
      ]
    },
    {
      "id": "3",
      "name": "snow-band",
      "selector": [
        ".colscontainer.container--bg-snow:not(.container--bg-snow + .colscontainer)"
      ],
      "style": "snow",
      "blocks": [
        "cards-tile",
        "accordion-program",
        "columns-media"
      ],
      "defaultContent": [
        ".heading",
        ".text",
        ".button",
        ".image"
      ]
    },
    {
      "id": "4",
      "name": "snow-band-2",
      "selector": [
        ".colscontainer.container--bg-snow + .colscontainer.container--bg-snow"
      ],
      "style": "snow",
      "blocks": [
        "cards-logo"
      ],
      "defaultContent": [
        ".heading",
        ".text",
        ".button"
      ]
    },
    {
      "id": "v5",
      "name": "tint-sky-10-band",
      "selector": [
        ".colscontainer.container--bg-tint-sky-10:not(.container--bg-tint-sky-10 + .colscontainer)"
      ],
      "style": "tint-sky-10",
      "blocks": [
        "columns-media",
        "columns-text",
        "columns-spotlight"
      ],
      "defaultContent": [
        ".heading",
        ".text"
      ]
    },
    {
      "id": "5",
      "name": "get-in-touch",
      "selector": [
        ".colscontainer.container--bg-tint-sky-5"
      ],
      "style": "tint-sky-5",
      "blocks": [
        "embed-iframe",
        "cards-resource"
      ],
      "defaultContent": [
        ".heading",
        ".text",
        ".separator"
      ]
    },
    {
      "id": "v10",
      "name": "plain-after-band",
      "selector": [
        ":is(.container--bg-ocean, .container--bg-snow, .container--bg-tint-sky-10, .container--bg-tint-sky-5) + .colscontainer:not([class*='container--bg']):has(.text, .heading, .image, .mastercard)"
      ],
      "style": null,
      "blocks": [
        "columns-media",
        "cards-tile"
      ],
      "defaultContent": [
        ".heading",
        ".text",
        ".image"
      ]
    }
  ]
};

// TRANSFORMER REGISTRY - cleanup, sections (2+ sections only), DM images, then article
// metadata last (it merges into the single Metadata block written by createMetadata)
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
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
