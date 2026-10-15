/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import accordionProgramParser from './parsers/accordion-program.js';
import cardsCalendarParser from './parsers/cards-calendar.js';
import cardsDocumentsParser from './parsers/cards-documents.js';
import cardsVideoParser from './parsers/cards-video.js';
import columnsContactParser from './parsers/columns-contact.js';
import embedIframeParser from './parsers/embed-iframe.js';
import heroArticleParser from './parsers/hero-article.js';
import modalTermsParser from './parsers/modal-terms.js';
import tableDataParser from './parsers/table-data.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/woolworthsgroup-cleanup.js';
import sectionsTransformer from './transformers/woolworthsgroup-sections.js';
import dmImagesTransformer from './transformers/woolworthsgroup-dm-images.js';
import articleMetadataTransformer from './transformers/article-metadata.js';

// PARSER REGISTRY
const parsers = {
  'accordion-program': accordionProgramParser,
  'cards-calendar': cardsCalendarParser,
  'cards-documents': cardsDocumentsParser,
  'cards-video': cardsVideoParser,
  'columns-contact': columnsContactParser,
  'embed-iframe': embedIframeParser,
  'hero-article': heroArticleParser,
  'modal-terms': modalTermsParser,
  'table-data': tableDataParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "investor-page",
  "description": "Investor pages (AEM media/sub-landing templates): side navigation, link lists of documents, tables, cards.",
  "urls": [
    "https://www.woolworthsgroup.com.au/au/en/investors/our-performance/results-and-presentations.html",
    "https://www.woolworthsgroup.com.au/au/en/investors/our-performance/asx-announcements.html",
    "https://www.woolworthsgroup.com.au/au/en/investors/our-performance/share-price.html",
    "https://www.woolworthsgroup.com.au/au/en/investors/shareholding-information/shareholding.html",
    "https://www.woolworthsgroup.com.au/au/en/investors/our-performance/webcasts.html",
    "https://www.woolworthsgroup.com.au/au/en/investors/our-performance/five-year-summary.html",
    "https://www.woolworthsgroup.com.au/au/en/investors/shareholding-information/investor-contact.html",
    "https://www.woolworthsgroup.com.au/au/en/investors/our-performance/debt-investors.html",
    "https://www.woolworthsgroup.com.au/au/en/investors/shareholding-information/shareholder-calendar.html",
    "https://www.woolworthsgroup.com.au/au/en/investors/shareholding-information/annual-general-meetings.html",
    "https://www.woolworthsgroup.com.au/au/en/investors/our-performance/reports-archive.html",
    "https://www.woolworthsgroup.com.au/au/en/investors/shareholding-information/dividends.html",
    "https://www.woolworthsgroup.com.au/au/en/investors/shareholding-information/shareholder-faqs.html",
    "https://www.woolworthsgroup.com.au/au/en/investors/shareholding-information/annual-general-meetings-archive.html",
    "https://www.woolworthsgroup.com.au/au/en/investors/our-performance/Financial-Results-archive.html"
  ],
  "blocks": [
    {
      "name": "hero-article",
      "instances": [
        "herobannercarousel.heroBannerCarousel:has(.banner--category)"
      ]
    },
    {
      "name": "modal-terms",
      "instances": [
        ".wwgmodal:has(modal.modal)"
      ]
    },
    {
      "name": "accordion-program",
      "instances": [
        ".accordion.accordion-core:not(.accordion .accordion)"
      ]
    },
    {
      "name": "cards-documents",
      "instances": [
        ".container__body__content:has(> .container__body__content__cols > .cmp-container > .linklist):not(.accordion *)"
      ]
    },
    {
      "name": "cards-video",
      "instances": [
        ".container__body__content:has(> .container__body__content__cols > .cmp-container > .mastercard .card__video):not(.accordion *)"
      ]
    },
    {
      "name": "embed-iframe",
      "instances": [
        ".tabs.panelcontainer:has(iframe)"
      ]
    },
    {
      "name": "table-data",
      "instances": [
        "tablecomp.tableComp table.table-comp__section",
        ".text .cmp-text > table:not(.accordion *)"
      ]
    },
    {
      "name": "cards-calendar",
      "instances": [
        ".cmp-container:has(> .mastercardlist > mastercardlist.calendar-list)"
      ]
    },
    {
      "name": "columns-contact",
      "instances": [
        ".container__body__content.container__body__two-column:has(.contactpanel)"
      ]
    }
  ],
  "sections": [
    {
      "id": "s1",
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
      "id": "s2",
      "name": "investor-content",
      "selector": [
        ".side-nav-template__body__content .media-template-body",
        ".sub-landing-template-body herobannercarousel.heroBannerCarousel ~ :is(.container, .colscontainer)"
      ],
      "style": null,
      "blocks": [
        "modal-terms",
        "accordion-program",
        "cards-documents",
        "cards-video",
        "embed-iframe",
        "table-data",
        "cards-calendar",
        "columns-contact"
      ],
      "defaultContent": [
        ".side-nav-template__body__content .heading:not(.accordion *):not(.container__body__two-column *)",
        ".side-nav-template__body__content .text:not(.accordion *):not(:has(table)):not(.container__body__two-column *)",
        ".side-nav-template__body__content cta.button-container.cta-primary:not(.accordion *)",
        "tablecomp.tableComp .table-comp__title"
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
