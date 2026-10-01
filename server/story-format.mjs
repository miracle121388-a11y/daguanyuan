// The writer, editor and recovery pass share one machine-readable contract.
// Shape checks never replace literary, source or character-knowledge checks.
export const reviewCategories = ['chronology', 'knowledge', 'motivation', 'continuity', 'branch', 'edition', 'staging'];
const ids = ['baoyu', 'daiyu', 'baochai', 'wangxifeng'];
const string = (maxLength, minLength = 1) => ({type: 'string', minLength, maxLength});
const enumeration = values => ({type: 'string', enum: values});
const array = (items, maxItems, minItems = 0) => ({type: 'array', items, minItems, maxItems});
const object = (properties, required = Object.keys(properties)) => ({type: 'object', properties, required, additionalProperties: false});
export const reviewSchema = object({
  approved: {type: 'boolean'},
  checks: array(object({category: enumeration(reviewCategories), status: enumeration(['pass', 'blocked']), evidence: string(220)}), 7, 7),
  issues: array(string(220), 7),
});
export function continuationSchema(operation, payload) {
  if (operation === 'story-read') return object({summary: string(10000)});
  const properties = {
    title: string(100), narrative: string(payload.mode === 'playback' ? 1800 : 3000, 200),
    memory: string(10000), threads: array(string(200), 8), causality: string(500),
    characterStates: array(object({agent: enumeration(ids), alive: {type: 'boolean'}}), 4, 4),
    consequences: array(object({agent: enumeration(ids), fact: string(500)}), 4),
    staging: array(object({agent: enumeration(ids), place: enumeration(payload.places.map(p => p.id)), action: enumeration(['read', 'write', 'rest', 'observe']), caption: string(120)}), 2),
  };
  const required = Object.keys(properties);
  // Provenance comes from the server, never from a generated citation.
  if (payload.mode === 'playback') properties.sourceChapter = object({chapter: {type: 'integer', const: payload.nextChapter}, title: string(200), sourceEdition: string(80), sha256: {type: 'string', pattern: '^[a-f0-9]{64}$'}});
  properties.review = reviewSchema;
  if (operation === 'story-review') required.push('review');
  return object(properties, required);
}
// This small validator implements only the vocabulary used above. Diagnostics
// contain field paths and constraints, never story text or private corpus data.
export function schemaIssues(schema, value, path = '$') {
  const issues = [];
  const add = reason => issues.push(`${path}: ${reason}`);
  if (schema.type === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return [`${path}: must be an object`];
    for (const key of schema.required) if (!Object.hasOwn(value, key)) issues.push(`${path}.${key}: required`);
    for (const key of Object.keys(value)) {
      // Do not reflect model-supplied arbitrary property names into logs.
      if (!Object.hasOwn(schema.properties, key)) add('unexpected property');
      else issues.push(...schemaIssues(schema.properties[key], value[key], `${path}.${key}`));
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) return [`${path}: must be an array`];
    if (value.length < schema.minItems || value.length > schema.maxItems) add(`needs ${schema.minItems}..${schema.maxItems} items (got ${value.length})`);
    value.slice(0, schema.maxItems + 1).forEach((v, i) => issues.push(...schemaIssues(schema.items, v, `${path}[${i}]`)));
  } else if (schema.type === 'string') {
    if (typeof value !== 'string') return [`${path}: must be a string`];
    if (schema.minLength !== undefined && value.trim().length < schema.minLength) add(`minimum ${schema.minLength} characters`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) add(`maximum ${schema.maxLength} characters (got ${value.length})`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) add('invalid pattern');
  } else if (schema.type === 'boolean' && typeof value !== 'boolean') add('must be a boolean');
  else if (schema.type === 'integer' && !Number.isInteger(value)) add('must be an integer');
  if (schema.enum && !schema.enum.includes(value)) add('not an allowed value');
  if (schema.const !== undefined && value !== schema.const) add('wrong value');
  return issues;
}
export function continuationIssues(operation, result, payload) {
  const issues = schemaIssues(continuationSchema(operation, payload), result);
  if (operation === 'story-read' || result === null || typeof result !== 'object') return issues;
  if (Array.isArray(result.characterStates)) {
    if (new Set(result.characterStates.map(s => s?.agent)).size !== 4) issues.push('$.characterStates: each of the four characters must occur exactly once');
    if (result.characterStates.some(s => s?.alive && !payload.stageActors.some(a => a.id === s.agent && a.alive))) issues.push('$.characterStates: a deceased character cannot be resurrected');
  }
  if (Array.isArray(result.consequences) && new Set(result.consequences.map(s => s?.agent)).size !== result.consequences.length) issues.push('$.consequences: duplicate character');
  if (Array.isArray(result.staging) && result.staging.some(s => !payload.stageActors.some(a => a.id === s?.agent) || !result.characterStates?.some?.(a => a?.agent === s?.agent && a.alive))) issues.push('$.staging: only living stage characters can appear');
  if (result.review && typeof result.review === 'object') {
    const r = result.review;
    if (Array.isArray(r.checks) && new Set(r.checks.map(c => c?.category)).size !== 7) issues.push('$.review.checks: seven distinct categories are required');
    if (Array.isArray(r.issues) && Array.isArray(r.checks) && r.approved !== (r.issues.length === 0 && r.checks.every(c => c?.status === 'pass'))) issues.push('$.review: approval must agree with checks and unresolved issues; never fabricate a pass');
  }
  return issues;
}
export function parseModelObject(content) {
  if (typeof content !== 'string' || !content.trim()) throw new Error('empty-content');
  // Strip only an envelope around the ENTIRE output. Never search prose for an
  // arbitrary object, close incomplete JSON, or silently discard story fields.
  const trimmed = content.trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed);
  const value = JSON.parse(fenced ? fenced[1] : trimmed);
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('not-object');
  return value;
}
