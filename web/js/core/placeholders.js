/** @typedef {Record<string, string>} PlaceholderMap */

import { replaceAllPhrases, findWholePhraseMatches } from './word-boundary.js';

const PREPARED_PLACEHOLDER_RE = /\[[A-Z]+ \d+\]/g;

const TYPE_PREFIX = {
  email: 'EMAIL',
  phone: 'PHONE',
  address: 'PLACE',
  camp_address: 'CAMP',
  postal_code: 'POSTAL',
  date_of_birth: 'DOB',
  age: 'AGE',
  gps: 'GPS',
  ip: 'IP',
  payment_card: 'CARD',
  sin: 'SIN',
  iban: 'IBAN',
  id_number: 'ID',
  imei: 'IMEI',
  passport_mrz: 'MRZ',
  person: 'PERSON',
  organization: 'ORG',
  place: 'PLACE'
};

/**
 * @param {import('./types.js').Finding} finding
 * @param {Map<string, string>} entityMap
 * @param {Record<string, number>} counters
 * @returns {string}
 */
export function assignPlaceholder(finding, entityMap, counters) {
  const normalized = finding.text.trim().toLowerCase();
  const prefix = TYPE_PREFIX[finding.type] || 'ITEM';

  if (finding.entityKey) {
    if (entityMap.has(finding.entityKey)) return entityMap.get(finding.entityKey);
    const key = finding.entityKey;
    counters[prefix] = (counters[prefix] || 0) + 1;
    const ph = `[${prefix} ${counters[prefix]}]`;
    entityMap.set(key, ph);
    return ph;
  }

  const entityKey = `${finding.type}:${normalized}`;
  if (entityMap.has(entityKey)) return entityMap.get(entityKey);

  counters[prefix] = (counters[prefix] || 0) + 1;
  const placeholder = `[${prefix} ${counters[prefix]}]`;
  entityMap.set(entityKey, placeholder);
  return placeholder;
}

/**
 * Default action for findings when preparing text.
 * @param {import('./types.js').Finding} finding
 * @returns {import('./types.js').FindingAction}
 */
export function defaultPrepareAction(finding) {
  if (finding.layer === 'context' || finding.layer === 'mosaic') return 'keep';
  if (finding.action && finding.action !== 'pending') return finding.action;
  if (finding.layer === 'pattern' || finding.layer === 'ner') return 'replace';
  return finding.action || 'pending';
}

/**
 * Build prepared text from findings and actions.
 * Every occurrence of a replaced or generalized phrase receives the same value.
 * @param {string} text
 * @param {import('./types.js').Finding[]} findings
 * @returns {{ text: string, map: PlaceholderMap, counts: { replaced: number, generalized: number, kept: number } }}
 */
export function buildPreparedText(text, findings) {
  const entityMap = new Map();
  const counters = {};
  const reverseMap = {};
  let replaced = 0;
  let generalized = 0;
  let kept = 0;

  const actionable = findings
    .filter((f) => f.layer !== 'mosaic' && f.layer !== 'context')
    .map((f) => ({ ...f, action: defaultPrepareAction(f) }));

  for (const f of actionable) {
    if (f.action === 'keep') kept += 1;
  }

  const replaceGroups = new Map();
  for (const f of actionable) {
    if (f.action !== 'replace' && f.action !== 'generalize') continue;
    const key = `${f.action}:${f.type}:${f.text.trim().toLowerCase()}`;
    if (!replaceGroups.has(key)) {
      replaceGroups.set(key, { finding: f, action: f.action, firstStart: f.start });
    } else {
      const g = replaceGroups.get(key);
      if (f.start < g.firstStart) g.firstStart = f.start;
    }
  }

  const ordered = [...replaceGroups.values()].sort((a, b) => a.firstStart - b.firstStart);

  let result = text;
  for (const group of ordered) {
    const f = group.finding;
    let replacement;
    if (group.action === 'generalize') {
      replacement = f.generalizedText || f.text;
      const { text: next, count } = replaceAllPhrases(result, f.text, replacement);
      result = next;
      generalized += count;
    } else {
      replacement = f.placeholder || assignPlaceholder(f, entityMap, counters);
      f.placeholder = replacement;
      reverseMap[replacement] = f.text;
      const { text: next, count } = replaceAllPhrases(result, f.text, replacement);
      result = next;
      replaced += count;
    }
  }

  const map = filterMapToPrepared(result, reverseMap);

  return {
    text: result,
    map,
    counts: { replaced, generalized, kept }
  };
}

/**
 * Keep only placeholders that appear in the prepared text.
 * @param {string} preparedText
 * @param {PlaceholderMap} map
 * @returns {PlaceholderMap}
 */
export function filterMapToPrepared(preparedText, map) {
  const present = new Set(preparedText.match(PREPARED_PLACEHOLDER_RE) || []);
  const filtered = {};
  for (const [ph, val] of Object.entries(map)) {
    if (present.has(ph)) filtered[ph] = val;
  }
  return filtered;
}

/**
 * Find replace/generalize phrases still present in prepared text.
 * @param {string} preparedText
 * @param {import('./types.js').Finding[]} findings
 * @returns {Array<{ text: string, type: string, finding: import('./types.js').Finding }>}
 */
export function validatePreparedText(preparedText, findings) {
  const violations = [];
  const seen = new Set();

  for (const f of findings) {
    const action = defaultPrepareAction(f);
    if (action !== 'replace' && action !== 'generalize') continue;
    const phrase = f.text.trim();
    const key = `${action}:${phrase.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (findWholePhraseMatches(preparedText, phrase).length > 0) {
      violations.push({ text: phrase, type: f.type, finding: f });
    }
  }

  return violations;
}

/**
 * Create entity key for NER spans.
 * @param {string} type
 * @param {string} text
 * @returns {string}
 */
export function nerEntityKey(type, text) {
  return `${type}:${text.trim().toLowerCase()}`;
}
