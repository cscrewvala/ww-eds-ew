/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import cardsStatsParser from './parsers/cards-stats.js';
import cardsStoryParser from './parsers/cards-story.js';
import columnsLogosParser from './parsers/columns-logos.js';
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
  'cards-stats': cardsStatsParser,
  'cards-story': cardsStoryParser,
  'columns-logos': columnsLogosParser,
  'hero-story': heroStoryParser,
  'quote-story': quoteStoryParser,
  'video-story': videoStoryParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "story-article",
  "description": "Sustainability story article (AEM content-page-template) under our-stories/<year>/. Sampled the 20 newest stories shown in the Our Stories listing. Also covers the remaining content-page-template our-impact pages with the same structure: older dated stories, podcast landing + episodes (our-stories/podcast/*) and sustainability sub-pages (e.g. human-rights/cotton).",
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
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/meet-the-team-kash-chanderjith.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/human-rights/the-ethical-recruitment-marketplace.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/climate-and-nature/Innovation-in-pork-production.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/human-rights/responsible-sourcing-program.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/health-and-nutrition/inspiring-and-empowering-the-next-generation.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/climate-and-nature/cage-free-eggs.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/human-rights/remediating-a-modern-slavery-indicator-in-our-electric-vehicle-supply-chain.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/health-and-nutrition/Making-our-own-brands-healthier.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/human-rights/forced-labour-is-a-global-challenge.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/health-and-nutrition/healthier-inspiration-and-digital-tools.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/human-rights/cotton.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/human-rights/effective-grievance-mechanisms.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/human-rights/bespoke-interventions-to-address-modern-slavery-risks.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/waste-and-circularity/unlocking-value-through-reuse.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/waste-and-circularity/soft-plastics-recycling.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/waste-and-circularity/partnering-for-progress-to-reduce-recycle-plastic-packaging.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/human-rights/partnerships-and-advocacy.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2023/fighting-food-insecurity.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/mini-woolies.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/how-the-primary-connect-team-helps-townsville-community.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/meet-the-team-johnson-chen.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/meet-team-member-kylee-bentham.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/woolworths-group-25-year-club.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/meet-the-team-majd-aboalway.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/ozharvest-woolworths-group.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/naidoc-learning-with-dalmarri.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/naidoc-driving-employment-roadmap-forward.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/rise-up-on-international-womens-day.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/working-together-with-the-salvation-army.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/baronio-family-eastern-colour.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/fighting-food-waste.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/making-dreams-a-reality-for-small-businesses.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/clontarf-foundation-developing-mutual-connections.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/ardrossan-orchards-a-60-year-partnership.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/building-a-culture-of-inclusion.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/woolworths-group-reconciliation-action-plan.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/big-w-toys-for-joy.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/woolworths-team-member-stephen-ward.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/woolworths-food-company-leads-the-way.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/woolworths-team-member-eco-ambassador-gerard.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/woolworths-group-to-run-on-100-percent-renewable-electricity.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/woolies-wheels-and-walks.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/diverting-food-waste-to-animals-in-need.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/the-positive-impact-of-ozharvest.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/woolworths-gove-store-where-community-is-key.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/connection-to-community.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/a-family-legacy-of-award-winning-mangoes.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/meet-the-team-robert-carratt.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/grown-with-care-from-rinaland-farm.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/elevato-and-sons-three-generations-of-quality-produce.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/meet-the-team-tiffany-crouch.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/meet-the-team-eduardo-pena.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/supporting-innovation-in-verde-valley.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/a-champion-for-diversity-and-inclusion.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/a-family-affair-in-regional-queensland.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/meet-the-team-tamim-faizi.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/sharing-small-joys-during-difficult-times.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/meet-the-team-julie-finch.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/the-new-app-helping-customers-find-value.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/caring-for-the-remote-community-of-newman.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/a-long-career-of-innovation.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/a-fresh-start-for-new-team-member-louay-khalil.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/meet-the-team-sarahcorey.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/finding-more-ways-to-help-customers.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/leading-with-pride-in-humpty-doo.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/i-was-the-first-face-of-woolworths.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/celebrating-the-dedication-of-our-long-serving-team-members.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/reflecting-on-our-100-years.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/Leading-with-authenticity-on-International-Mens-Day.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/feeding-the-darwin-community.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/woolworths-and-wires-food-for-wildlife.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2025/the-journey-to-100-mini-woolies-across-australia-and-new-zealand.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/a-partnership-with-spirit-crafting-christmas-flavour.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2024/meet-the-team-jono-wheeler.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/podcast.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2026/meet-the-team-katherine.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2026/meet-the-team-john.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/podcast/the-clontarf-foundation.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/podcast/ozharverst-on-delivering-100-million-meals-to-aussies-in-need.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/podcast/the-salvation-army.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/podcast/the-remarkable-origin-story-of-woolworths.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2026/australia-needs-to-map-out-clearer-disaster-routes.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2026/a-decade-of-reducing-hunger-100-million-meals-with-OzHarvest.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/podcast/rural-aid-supporting-aussie-farmers.html",
    "https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2026/hunger.html"
  ],
  "blocks": [
    {
      "name": "hero-story",
      "instances": [
        ".container__body__two-column.two-50-50:has(h1)",
        ".image.heroBannerV3-imageBanner:not(.colscontainer *):has(~ .colscontainer .two-75-25 h1)"
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
        ".container__body__one-column .contenttile.teaser",
        ".container__body__two-column.two-75-25 > .container__body__content__cols:has(.contenttile)"
      ]
    },
    {
      "name": "cards-stats",
      "instances": [
        ".heroStats:not(.accordion *)"
      ]
    },
    {
      "name": "columns-logos",
      "instances": [
        ".container__body__content.container__body__six-column:has(.image):not(.accordion *)"
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
