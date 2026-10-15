// Build migration-work/block-generation-manifest.json from authoring-analysis.json (Step 3.5).
// Usage: node migration-work/build-manifest.mjs <template-name>
import fs from 'node:fs';
import path from 'node:path';

const SCRIPTS_DIR = '/home/node/.excat-marketplaces/excat-marketplace/excat/sub-agents/excat-block-generator/scripts';
const { resolveBlockTarget } = await import(`${SCRIPTS_DIR}/build-generation-manifest.js`);

const root = process.cwd();
const template = process.argv[2];
const analysis = JSON.parse(fs.readFileSync('migration-work/authoring-analysis.json', 'utf8'));
const project = JSON.parse(fs.readFileSync('.migration/project.json', 'utf8'));
const projectType = project.type || 'da';

const richness = (q) => JSON.stringify(q.contentModel || q.blockContent || {}).length;
const groups = new Map();
for (const section of [...(analysis.sections || []), ...(analysis.variationSections || [])]) {
  for (const q of section.sequences || []) {
    if (q.decision !== 'block' && !q.blockVariant) continue;
    const block = q.blockVariant || q.blockName;
    if (!block) continue;
    let baseBlock = q.baseBlock;
    if (!baseBlock) baseBlock = q.blockVariant ? q.blockVariant.split('-')[0] : block;
    const opts = (q.options || q.variations || []).map((o) => (typeof o === 'string' ? o : o.class || o.name)).filter(Boolean);
    const g = groups.get(block);
    if (!g) {
      groups.set(block, {
        block, baseBlock, options: new Set(opts), best: q, section,
      });
    } else {
      if (g.baseBlock !== baseBlock) throw new Error(`baseBlock mismatch for ${block}: ${g.baseBlock} vs ${baseBlock}`);
      opts.forEach((o) => g.options.add(o));
      if (richness(q) > richness(g.best)) { g.best = q; g.section = section; }
    }
  }
}

const entries = [];
const reused = [];
for (const g of groups.values()) {
  const options = [...g.options];
  const r = resolveBlockTarget({ projectRoot: root, block: g.block, baseBlock: g.baseBlock, options, projectType });
  if (r.status === 'skip-exists') { reused.push(g.block); continue; }
  entries.push({
    block: g.block,
    baseBlock: g.baseBlock,
    status: r.status,
    newOptions: r.newOptions,
    missingFiles: r.missingFiles,
    targetDir: r.targetDir,
    targetFiles: r.targetFiles,
    canonicalModel: g.best.canonicalModel || 'standalone',
    projectType,
    sourceUrl: g.section.sourceUrl || analysis.url,
    screenshots: [path.join(root, 'migration-work/screenshot.png')],
    blockContent: g.best.contentModel || g.best.blockContent || null,
    sectionMetadata: g.section.sectionMetadata || g.section.styling || null,
    visualCharacteristics: g.best.visualCharacteristics || null,
    contentPattern: [g.best.description, g.best.reason, g.section.summary].filter(Boolean).join(' | '),
    options,
  });
}
fs.writeFileSync('migration-work/block-generation-manifest.json', JSON.stringify({
  mode: 'manifest', source: 'site-migration-per-page', template, entries,
}, null, 2));
console.log(JSON.stringify({ generate: entries.map((e) => `${e.block}:${e.status}`), reused }));
