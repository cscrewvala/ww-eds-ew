/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import articleListParser from './parsers/article-list.js';
import cardsFeaturedParser from './parsers/cards-featured.js';
import heroArticleParser from './parsers/hero-article.js';
import heroBannerParser from './parsers/hero-banner.js';
import heroBrandParser from './parsers/hero-brand.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/woolworthsgroup-cleanup.js';
import sectionsTransformer from './transformers/woolworthsgroup-sections.js';
import dmImagesTransformer from './transformers/woolworthsgroup-dm-images.js';
import articleMetadataTransformer from './transformers/article-metadata.js';

// PARSER REGISTRY
const parsers = {
  'article-list': articleListParser,
  'cards-featured': cardsFeaturedParser,
  'hero-article': heroArticleParser,
  'hero-banner': heroBannerParser,
  'hero-brand': heroBrandParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "listing-page",
  "description": "Pages whose primary content is a DYNAMIC filtered listing of articles (newsArticlesDynamic, latestNewsDynamic, filterTag+contentTile). Listings must be migrated as query-index driven article-list blocks, not static cards.",
  "urls": [
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/100-years-of-wwg.html"
  ],
  "blocks": [
    {
      "name": "article-list",
      "instances": [
        ".newsarticles.list",
        ".latestnews.list",
        ".cmp-container:has(> .filtertag)"
      ]
    },
    {
      "name": "hero-article",
      "instances": [
        "herobannercarousel.heroBannerCarousel:has(.banner--category)"
      ]
    },
    {
      "name": "hero-banner",
      "instances": [
        "herobannercarousel.heroBannerCarousel:not(:has(.banner--category))"
      ]
    },
    {
      "name": "hero-brand",
      "instances": [
        ".colscontainer.heroBannerV3"
      ]
    },
    {
      "name": "cards-featured",
      "instances": [
        ".container__body__two-column.two-50-50:has(.contenttile)"
      ]
    }
  ],
  "sections": [
    {
      "id": "1",
      "name": "title-band",
      "selector": [
        ".colscontainer.container--bg-ocean:not(.heroBannerV3):not(:has(.text))"
      ],
      "style": "ocean",
      "blocks": [],
      "defaultContent": [
        ".colscontainer.container--bg-ocean:not(.heroBannerV3):not(:has(.text)) .heading"
      ]
    },
    {
      "id": "2",
      "name": "news-listing",
      "selector": [
        ".colscontainer:has(.newsarticles)"
      ],
      "style": null,
      "blocks": [
        "article-list"
      ],
      "defaultContent": [
        ".colscontainer:has(.newsarticles) div.button"
      ]
    },
    {
      "id": "3",
      "name": "archive-hero",
      "selector": [
        "herobannercarousel.heroBannerCarousel:has(.banner--category)"
      ],
      "style": null,
      "blocks": [
        "hero-article"
      ],
      "defaultContent": []
    },
    {
      "id": "4",
      "name": "archive-listing",
      "selector": [
        ".colscontainer:has(.latestnews)"
      ],
      "style": null,
      "blocks": [
        "article-list"
      ],
      "defaultContent": [
        ".colscontainer:has(.latestnews) div.button"
      ]
    },
    {
      "id": "5",
      "name": "stories-hero",
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
      "id": "6",
      "name": "stories-listing",
      "selector": [
        ".colscontainer.article-homepage:not(:has(.heading))"
      ],
      "style": null,
      "blocks": [
        "article-list"
      ],
      "defaultContent": []
    },
    {
      "id": "7",
      "name": "brand-hero",
      "selector": [
        ".heroBanner.teaser:has(> .heroBannerV3)"
      ],
      "style": null,
      "blocks": [
        "hero-brand"
      ],
      "defaultContent": []
    },
    {
      "id": "8",
      "name": "featured-stories",
      "selector": [
        ".colscontainer:has(> .container__body > .container__body__two-column .contenttile)"
      ],
      "style": null,
      "blocks": [
        "cards-featured"
      ],
      "defaultContent": []
    },
    {
      "id": "9",
      "name": "news-and-stories",
      "selector": [
        ".colscontainer.article-homepage:has(.heading)"
      ],
      "style": null,
      "blocks": [
        "article-list"
      ],
      "defaultContent": [
        ".colscontainer.article-homepage:has(.heading) .heading"
      ]
    },
    {
      "id": "10",
      "name": "careers-cta",
      "selector": [
        ".colscontainer.container--bg-ocean:not(.heroBannerV3):has(.text)"
      ],
      "style": "ocean, centered",
      "blocks": [],
      "defaultContent": [
        ".colscontainer.container--bg-ocean:not(.heroBannerV3):has(.text) .heading",
        ".colscontainer.container--bg-ocean:not(.heroBannerV3):has(.text) .text.snow .cmp-text",
        ".colscontainer.container--bg-ocean:not(.heroBannerV3):has(.text) div.button"
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
