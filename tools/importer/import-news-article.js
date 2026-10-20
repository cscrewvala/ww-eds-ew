/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroArticleParser from './parsers/hero-article.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/woolworthsgroup-cleanup.js';
import sectionsTransformer from './transformers/woolworthsgroup-sections.js';
import dmImagesTransformer from './transformers/woolworthsgroup-dm-images.js';
import articleMetadataTransformer from './transformers/article-metadata.js';

// PARSER REGISTRY
const parsers = {
  'hero-article': heroArticleParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "news-article",
  "description": "Media release / news article (AEM media-page-template): hero banner with category + title, body text, side navigation. Sampled 20 latest-news, 20 news-archive, 14 check-it-out (newest first).",
  "urls": [
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-locks-in-cinnabon-cake-as-a-permanent-bakery-hero.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/big-w-treats-thousands-of-mums-to-free-gifts-from-new-autumn-win.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-bricks-returns-with-a-spin-on-cricket.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/mini-woolies-tafe-casino.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/top-bakers-battle-for-glory-at-woolworths-baker-of-the-year-2026.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/media-release---australian-beef-industry-collaboration-launches.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-group-now-powering-its-business-with-100--renewable-e.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/all-the-ways-to-win-at-woolies-in-the-new-year--cars--gift-cards.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-shakes-up-home-cooking-with-70-new-globally-inspired-.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-and-share-the-dignity-team-up-for-march-dignity-drive.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-fissler-launch.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/big-w-drops-prices-on-over-2-000-products-to-help-customers-save.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/st-marys-estore-launch-.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/little-one-s-nappies-get-major-overhaul-with-improved-absorbency.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/milkrun-is-giving-away-20-000-free-grocery-items.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-brings-back-in-store-soft-plastics-collection.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/healthylife-living-healthy-report-2026-.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/australian-dairy-farmers-have-now-received-an-extra-10m-from-woolworths-sustainable-dairy-initiatives.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/national-regional-launch-of-2026-anzac-appeal-takes-place-at-woo.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/-game-on---woolworths--netball-grants-return-with-funding-for-gr.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/ceo-and-chairman-acknowledge-leadership-responsibility.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/aussies-can-make-a-difference-for-food-insecure-families-heading-back-to-school.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/big-w-announcement.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/delivery-now-service-offers-brisbane-grocery-delivery-in-under-two-hours.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/disney-and-woolworths-team-up-to-celebrate-the-lion-king.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/jamie-oliver-woolworths-make-healthier-eating-easier-for-aussies.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/caltex-and-woolworths-welcome-customers-to-the-new-age-of-convenience.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/f19-final-profit-and-dividend-announcement.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/endeavour-drinks-welcomes-chapel-hill-and-establishes-paragon-wine-estates.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/proposed-class-action-in-relation-to-salaried-team-member-payments.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/food-insecurity-at-christmas-an-increasing-reality.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/international-expert-to-help-fight-food-waste-in-australia.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/intention-to-separate-endeavour-group-following-merger-of-endeavour-drinks-and-alh.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/helping-australian-women-in-need.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/hilton-foods-australia-unveils-280m-fresh-meat-production-facility-in-heathwood-to-service-hundreds-of-woolworths-stores.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/check-it-out/2023/making-plastic-bags-history.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/lockyer-valley-farming-group-to-benefit-from-woolworths-organic-growth-fund.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/more-than-500-aussie-schools-to-share-in-half-a-million-dollars-to-help-grow-the-next-generation-of-environmental-champions.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/new-barcode-trial-promises-to-cut-product-recall-food-waste-and-improve-traceability.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/check-it-out/2023/deflation-in-fruit-and-veg.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/news-archive/2019/remote-schools-receive-educational-boost-through-woolworths-earn-and-learn-program.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/check-it-out/2023/putting-potatoes-to-sleep.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/check-it-out/2023/six-savings-hacks-for-online-shopping.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/check-it-out/2023/mini-woolies-in-tasmania.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/check-it-out/2023/pasta-match.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-freezes-shelf-prices-on-300-household-staples.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/check-it-out/2023/we-want-you-to-spend-less-this-spring.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/check-it-out/2023/winner-winner-chicken-dinner.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/check-it-out/2023/remote-deliveries.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/check-it-out/2023/berries-are-back-.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/check-it-out/2023/deirdre-retirement-.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/check-it-out/2023/rosh-hashanah.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/check-it-out/2023/Carnival-of-Flowers.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/check-it-out/2023/how-we-re-supporting-community-resilience.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-tackles-rugby-world-cup-with-major-new-sponsorship-ac.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/aussies-bag-1-billion-at-woolworths-affiliated-container-collection-points.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/big-w-lands-on-doordash.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-unveils-2026-festive-range-as-nearly-half-of-aussies-.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/big-w-setting-the-standard-for-aussie-retailers-with-better-cotton-certification.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-just-dropped-a-real--bachelor-s-handbag--.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/how-small-change-brings-hope-to-sick-children-like-ollie.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/Woolworths-partnership-with-glasshouse-grower-supplies-millions-of-kilograms-of-produce-a-year.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/everyday-rewards-expands-fuel-discount-across-almost-1-000-sites.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/meet-the-four-town-hall-store-team-members-with-139-years-combined-service.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/how-a-handshake-between-mates-became-a-40-year-family-tradition-supplying-woolworths-beef.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/big-w-delivers-800-big-price-drops-on-family-essentials.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/Woolworths-creates-more-than-300-jobs-in-Lauderdale-Tasmania.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-statement.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/new-smart-trolleys-roll-out-in-western-australia.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/far-north-queensland-welcomes-first-mini-woolies-sites-to-suppor.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/turn-your-weekly-shop-into-free-fissler-food-containers.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-expands-lower-shelf-price-to-over-1-000-everyday-prod.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/new-smart-trolleys-roll-out-in-south-australia.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolies-drops-its-first-ever-gluten-free-mudcake.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/big-w-s-new-ss26-collection-arrives-at-unbeatable-prices.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/everyday-rewards-and-commbank-join-forces-to-turn-everyday-banki.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/big-w-launches-same-day-delivery-with-doordash-to-rescue-stresse.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/travelex-and-everyday-rewards-announce-partnership-to-unlock-rew.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/share-the-dignity-august-drive.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/disney-ooshies-back-at-woolworths.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/2026-australian-commonwealth-games-team-coins.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-takes-the-hassle-out-of-the-weekly-shop-with-new-digi.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/big-w-unveils-1-300--toy-sale-deals-and-free-lay-by-to-help-fami.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-partners-with-netflix-to-launch-big-night-in-campaign.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-announces-major-casuarina-store-renewal-to-enhance-sh.html",
    "https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-serves-up-380-ways-to-do-dinner-with-a-massive-range-.html"
  ],
  "blocks": [
    {
      "name": "hero-article",
      "instances": [
        "section.cmp-carousel.hero-banner-carousel",
        "herobannercarousel.heroBannerCarousel"
      ]
    }
  ],
  "sections": [
    {
      "id": "1",
      "name": "hero-banner",
      "selector": [
        "herobannercarousel.heroBannerCarousel",
        "section.hero-banner-carousel"
      ],
      "style": null,
      "blocks": [
        "hero-article"
      ],
      "defaultContent": []
    },
    {
      "id": "2",
      "name": "article-body",
      "selector": [
        ".media-template-body",
        ".container.responsivegrid.media-template-body"
      ],
      "style": null,
      "blocks": [],
      "defaultContent": [
        ".media-template-body .cmp-text",
        ".media-template-body .cmp-image"
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
