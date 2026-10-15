/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import cardsStoryParser from './parsers/cards-story.js';
import heroStoryParser from './parsers/hero-story.js';
import quoteStoryParser from './parsers/quote-story.js';
import videoStoryParser from './parsers/video-story.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/woolworthsgroup-cleanup.js';
import sectionsTransformer from './transformers/woolworthsgroup-sections.js';
import dmImagesTransformer from './transformers/woolworthsgroup-dm-images.js';
import articleMetadataTransformer from './transformers/article-metadata.js';

// PARSER REGISTRY
const parsers = {
  'cards-story': cardsStoryParser,
  'hero-story': heroStoryParser,
  'quote-story': quoteStoryParser,
  'video-story': videoStoryParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "story-article",
  "description": "Sustainability story article (AEM content-page-template) under our-stories/<year>/. Sampled the 20 newest stories shown in the Our Stories listing.",
  "urls": [
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2026/2026-world-environment-day.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2026/fresh-food-depends-on-innovation-and-resilient-supply.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2026/woolworths-groups-new-sustainability-plan.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2026/31-million-and-growing-the-procurement-strategy-making-a-real-difference.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2026/how-woolworths-group-reached-100-renewable-electricity.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2026/Backing-the-next-generation-AgriEmpower-Scholarships-now-open.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2025/delivering-sustainable-seafood-choices-our-customers-can-trust.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2025/recycle-and-save.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2025/woolworths-farmer-cattle-partnership.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2025/partnering-with-rural-aid-to-back-aussie-farmers-during-tough-times.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2025/inspiring-indigenous-australians-through-achievement.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2025/generations-of-care-and-quality-cherries-at-wandin-valley-farms.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2025/thriving-in-a-quiet-and-inclusive-workplace.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2025/2025-living-healthy-report.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/reducing-hunger-in-the-top-end-in-partnership-with-foodbank.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/giving-the-gift-of-christmas.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/caring-for-kids-in-remote-rural-and-regional-qld-with-rfds.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/providing-career-pathways-for-diverse-talent.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/celebrating-woolworth-groups-proud-and-gender-diverse-team.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/meet-the-team-kash-chanderjith.html"
  ],
  "blocks": [
    {
      "name": "hero-story",
      "instances": [
        ".container__body__two-column.two-50-50:has(h1)"
      ]
    },
    {
      "name": "video-story",
      "instances": [
        ".wwgvideo"
      ]
    },
    {
      "name": "quote-story",
      "instances": [
        ".pullquote"
      ]
    },
    {
      "name": "cards-story",
      "instances": [
        ".container__body__two-column.two-50-50:has(.contenttile)",
        ".container__body__one-column .contenttile.teaser"
      ]
    }
  ],
  "sections": [
    {
      "id": "1",
      "name": "story-hero",
      "selector": [
        ".colscontainer:has(.container__body__two-column h1)"
      ],
      "style": null,
      "blocks": [
        "hero-story"
      ],
      "defaultContent": []
    },
    {
      "id": "2",
      "name": "story-body",
      "selector": [
        ".colscontainer:has(.container__body__one-column):not(:has(.container__body__two-column))"
      ],
      "style": null,
      "blocks": [
        "video-story",
        "quote-story",
        "cards-story"
      ],
      "defaultContent": [
        ".colscontainer:has(.container__body__one-column):not(:has(.container__body__two-column)) .text .cmp-text",
        ".colscontainer:has(.container__body__one-column):not(:has(.container__body__two-column)) .heading",
        ".colscontainer:has(.container__body__one-column):not(:has(.container__body__two-column)) .image .cmp-image",
        ".colscontainer:has(.container__body__one-column):not(:has(.container__body__two-column)) .button"
      ]
    },
    {
      "id": "3",
      "name": "related-stories",
      "selector": [
        ".colscontainer:has(.container__body__two-column .contenttile)"
      ],
      "style": null,
      "blocks": [
        "cards-story"
      ],
      "defaultContent": [
        ".colscontainer:has(.container__body__two-column .contenttile) .container__body__one-column .heading"
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
