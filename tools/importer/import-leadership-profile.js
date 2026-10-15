/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/woolworthsgroup-cleanup.js';
import sectionsTransformer from './transformers/woolworthsgroup-sections.js';
import dmImagesTransformer from './transformers/woolworthsgroup-dm-images.js';
import articleMetadataTransformer from './transformers/article-metadata.js';

// PARSER REGISTRY
const parsers = {
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "leadership-profile",
  "description": "Board of directors / management board profile pages (heading, photo, biography; default content only). Sampled 20 CURRENT leaders linked from the listing pages.",
  "urls": [
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/board-of-directors/jennifer-carr-smith.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/board-of-directors/jon-alferness.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/board-of-directors/kathee-tesija.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/board-of-directors/ken-meyer.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/board-of-directors/maxine-brenner.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/board-of-directors/philip-chronican.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/board-of-directors/scott-perkins.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/board-of-directors/warwick-bray.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/management-board/allan-beacham.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/management-board/amanda-bardwell.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/management-board/amitabh-mall.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/management-board/annette-karantoni.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/management-board/carly-richards.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/management-board/caroline-israel.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/management-board/dan-hake.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/management-board/jaimie-lovell.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/management-board/mike-tyquin.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/management-board/peter-atkin.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/management-board/rob-mcCartney.html",
    "https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/management-board/sally-copland.html"
  ],
  "blocks": [],
  "sections": []
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
