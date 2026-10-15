/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import cardsFeaturedParser from './parsers/cards-featured.js';
import cardsTileParser from './parsers/cards-tile.js';
import heroBannerParser from './parsers/hero-banner.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/woolworthsgroup-cleanup.js';
import sectionsTransformer from './transformers/woolworthsgroup-sections.js';
import dmImagesTransformer from './transformers/woolworthsgroup-dm-images.js';
import articleMetadataTransformer from './transformers/article-metadata.js';

// PARSER REGISTRY
const parsers = {
  'cards-featured': cardsFeaturedParser,
  'cards-tile': cardsTileParser,
  'hero-banner': heroBannerParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "homepage",
  "description": "Homepage (source /au/en.html 301 -> /): hero banner carousel, curated content tiles.",
  "urls": [
    "https://www.woolworthsgroup.com.au/"
  ],
  "blocks": [
    {
      "name": "hero-banner",
      "instances": [
        "herobannercarousel.heroBannerCarousel:not(:has(.banner--category))"
      ]
    },
    {
      "name": "cards-featured",
      "instances": [
        ".container__body__two-column.two-50-50:has(.contenttile)"
      ]
    },
    {
      "name": "cards-tile",
      "instances": [
        ".container__body__three-column:has(.contenttile)"
      ]
    }
  ],
  "sections": [
    {
      "id": "1",
      "name": "hero",
      "selector": [
        "herobannercarousel.heroBannerCarousel:not(:has(.banner--category))"
      ],
      "style": null,
      "blocks": [
        "hero-banner"
      ],
      "defaultContent": []
    },
    {
      "id": "2",
      "name": "latest-news",
      "selector": [
        ".colscontainer.container--bg-snow:has(.container__body__two-column .contenttile)"
      ],
      "style": "snow",
      "blocks": [
        "cards-featured"
      ],
      "defaultContent": [
        ".colscontainer.container--bg-snow:has(.container__body__two-column .contenttile) .container__body__one-column .heading",
        ".colscontainer.container--bg-snow:has(.container__body__two-column .contenttile) div.button"
      ]
    },
    {
      "id": "3",
      "name": "asx-announcements",
      "selector": [
        ".colscontainer:not(.container--bg-snow):has(.container__body__three-column .contenttile)"
      ],
      "style": null,
      "blocks": [
        "cards-tile"
      ],
      "defaultContent": [
        ".colscontainer:not(.container--bg-snow):has(.container__body__three-column .contenttile) .container__body__one-column .heading",
        ".colscontainer:not(.container--bg-snow):has(.container__body__three-column .contenttile) div.button"
      ]
    },
    {
      "id": "4",
      "name": "find-out-more",
      "selector": [
        ".colscontainer.container--bg-snow:has(.container__body__three-column .contenttile)"
      ],
      "style": "snow",
      "blocks": [
        "cards-tile"
      ],
      "defaultContent": [
        ".colscontainer.container--bg-snow:has(.container__body__three-column .contenttile) .container__body__one-column .heading"
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
