/* eslint-disable */
/**
 * Validates the built Universal Editor files (component-definition/models/filters.json):
 * ids unique, references resolve, fields <-> model fields match, the section filter offers every
 * block, and every block used in content/ has a definition.
 * Usage: node test/ue/validate-models.cjs   (exit 1 on errors)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const errors = [];
const warnings = [];

const groups = read('component-definition.json').groups;
const models = read('component-models.json');
const filters = read('component-filters.json');
const defs = groups.flatMap((g) => g.components);
const COMPONENTS = new Set(['text', 'richtext', 'reference', 'select', 'multiselect', 'boolean', 'number', 'aem-content', 'date-time', 'container', 'tab', 'checkbox-group', 'radio-group']);

const dupes = (list, what) => {
  const seen = new Set();
  list.forEach((id) => { if (seen.has(id)) errors.push(`duplicate ${what} id "${id}"`); seen.add(id); });
};
dupes(defs.map((d) => d.id), 'definition');
dupes(models.map((m) => m.id), 'model');
dupes(filters.map((f) => f.id), 'filter');

const modelById = Object.fromEntries(models.map((m) => [m.id, m]));
const filterById = Object.fromEntries(filters.map((f) => [f.id, f]));
const defIds = new Set(defs.map((d) => d.id));

defs.forEach((d) => {
  const da = (d.plugins && d.plugins.da) || {};
  if (!d.title) errors.push(`definition ${d.id}: no title`);
  // allowed (reference text / columns-row / columns-cell): no panel fields
  if (d.model && !modelById[d.model]) warnings.push(`definition ${d.id}: model "${d.model}" not found (no panel fields)`);
  if (d.filter && !filterById[d.filter]) errors.push(`definition ${d.id}: filter "${d.filter}" not found`);
  if (da.unsafeHTML && (da.rows || da.columns)) errors.push(`definition ${d.id}: unsafeHTML and rows/columns are exclusive`);
  const model = modelById[d.model];
  const fieldNames = (da.fields || []).map((f) => f.name);
  dupes(fieldNames.map((n) => `${d.id}.${n}`), 'field');
  if (model) {
    const mNames = model.fields.map((f) => f.name);
    fieldNames.forEach((n) => { if (!mNames.includes(n)) errors.push(`definition ${d.id}: field "${n}" has no model field`); });
    if (da.fields && da.type !== 'key-value-block') {
      mNames.filter((n) => !/^classes/.test(n) && !fieldNames.includes(n))
        .forEach((n) => warnings.push(`definition ${d.id}: model field "${n}" has no selector (panel-only)`));
    }
  }
  (da.fields || []).forEach((f) => {
    if (!f.selector) errors.push(`definition ${d.id}: field "${f.name}" has no selector`);
  });
});

models.forEach((m) => (m.fields || []).forEach((f) => {
  if (!COMPONENTS.has(f.component)) errors.push(`model ${m.id}: field "${f.name}" unknown component "${f.component}"`);
  if (/select$/.test(f.component) && !(f.options || []).length) errors.push(`model ${m.id}: ${f.component} "${f.name}" without options`);
  if (!f.name) errors.push(`model ${m.id}: field without name`);
}));

filters.forEach((f) => (f.components || []).forEach((c) => {
  if (!defIds.has(c)) errors.push(`filter ${f.id}: component "${c}" has no definition`);
}));

// every block (top-level definition in the Blocks group) is offered in sections
const blockGroup = groups.find((g) => g.id === 'blocks');
const itemIds = new Set(filters.filter((f) => !['main', 'section'].includes(f.id)).flatMap((f) => f.components));
const sectionComponents = new Set((filterById.section || { components: [] }).components);
// columns-row / columns-cell definitions are created by the columns behaviour, not inserted
const internal = (d) => /^columns-(row|cell)$/.test((d.plugins && d.plugins.da && d.plugins.da.behaviour) || '');
(blockGroup ? blockGroup.components : []).filter((d) => !itemIds.has(d.id) && !internal(d))
  .forEach((d) => { if (!sectionComponents.has(d.id)) errors.push(`block ${d.id}: not in the section filter`); });

// blocks used in content have a definition
const used = new Map();
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) walk(p);
  else if (e.name.endsWith('.plain.html')) {
    const s = fs.readFileSync(p, 'utf8');
    for (const m of s.matchAll(/<div class="([a-z0-9-]+)[ "]/g)) {
      if (!used.has(m[1])) used.set(m[1], p.replace(`${ROOT}/content`, ''));
    }
  }
});
const contentDir = fs.realpathSync(path.join(ROOT, 'content'));
walk(contentDir);
const byName = new Set(defs.map((d) => (d.plugins && d.plugins.da && d.plugins.da.name) || d.id).concat([...defIds]));
[...used.keys()].filter((b) => !['metadata', 'section-metadata'].includes(b))
  .forEach((b) => { if (!byName.has(b)) errors.push(`block "${b}" used in content (e.g. ${used.get(b).replace(contentDir, '')}) has no definition`); });

console.log(`definitions ${defs.length}, models ${models.length}, filters ${filters.length}, blocks in content ${used.size}`);
warnings.forEach((w) => console.log('  warn ', w));
errors.forEach((e) => console.log('  ERROR', e));
console.log(errors.length ? `${errors.length} error(s)` : 'OK');
process.exit(errors.length ? 1 : 0);
