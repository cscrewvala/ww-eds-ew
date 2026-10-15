"""Generate tools/importer/import-<template>.js from page-templates.json.

Usage: python3 docs/migration/gen-import-script.py <template-name> [<template-name> ...]
Transformer order: cleanup -> sections -> dm-images -> article-metadata (merges the Metadata block).
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PT = json.load(open(os.path.join(ROOT, 'tools/importer/page-templates.json')))
TRANSFORMERS = [
    ('cleanupTransformer', 'woolworthsgroup-cleanup'),
    ('sectionsTransformer', 'woolworthsgroup-sections'),
    ('dmImagesTransformer', 'woolworthsgroup-dm-images'),
    ('articleMetadataTransformer', 'article-metadata'),
]


def camel(name):
    parts = name.split('-')
    return parts[0] + ''.join(p.title() for p in parts[1:]) + 'Parser'


def generate(name):
    tpl = next((t for t in PT['templates'] if t['name'] == name), None)
    if not tpl:
        sys.exit(f'Template {name} not found')
    block_names = sorted({b['name'] for b in tpl.get('blocks', [])})
    missing = [b for b in block_names if not os.path.exists(os.path.join(ROOT, f'tools/importer/parsers/{b}.js'))]
    if missing:
        sys.exit(f'Missing parsers for {name}: {missing}')
    for _, f in TRANSFORMERS:
        if not os.path.exists(os.path.join(ROOT, f'tools/importer/transformers/{f}.js')):
            sys.exit(f'Missing transformer {f}')
    embedded = {k: tpl[k] for k in ('name', 'description', 'urls', 'blocks', 'sections') if k in tpl}
    embedded.setdefault('sections', [])
    out = ['/* eslint-disable */', '/* global WebImporter */', '', '// PARSER IMPORTS']
    out += [f"import {camel(b)} from './parsers/{b}.js';" for b in block_names]
    out += ['', '// TRANSFORMER IMPORTS']
    out += [f"import {v} from './transformers/{f}.js';" for v, f in TRANSFORMERS]
    out += ['', '// PARSER REGISTRY', 'const parsers = {']
    out += [f"  '{b}': {camel(b)}," for b in block_names]
    out += ['};', '']
    out += ['// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json',
            'const PAGE_TEMPLATE = ' + json.dumps(embedded, indent=2) + ';', '']
    out += ['''// TRANSFORMER REGISTRY - cleanup, sections (generic, every template), DM images, then article
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
      .replace(/\\/$/, '')
      .replace(/\\.html?$/, '');
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
''']
    dest = os.path.join(ROOT, f'tools/importer/import-{name}.js')
    open(dest, 'w').write('\n'.join(out))
    with open(os.path.join(ROOT, f'tools/importer/urls-{name}.txt'), 'w') as f:
        f.write('\n'.join(tpl['urls']) + '\n')
    print(f'wrote {dest} ({len(tpl["urls"])} urls, blocks: {block_names})')


for n in sys.argv[1:]:
    generate(n)
