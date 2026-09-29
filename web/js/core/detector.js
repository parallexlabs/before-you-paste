import { detectPatterns, dedupeOverlapping } from './patterns.js';
import { detectContextFlags } from './context-flags.js';
import { detectMosaicWarnings, resetMosaicIds } from './mosaic.js';
import { expandSpanToWordBoundaries, mergeAdjacentSameType } from './entity-expand.js';
import { FINDING_TYPES } from './types.js';

/**
 * @typedef {Object} DetectOptions
 * @property {import('./types.js').Finding[]} [nerFindings]
 * @property {boolean} [includeNer]
 */

/**
 * Run pattern and context detection (sync).
 * @param {string} text
 * @param {DetectOptions} [options]
 * @returns {import('./types.js').Finding[]}
 */
export function detectAll(text, options = {}) {
  if (!text || !text.trim()) return [];

  resetMosaicIds();
  const patterns = detectPatterns(text);
  const context = detectContextFlags(text);
  const ner = options.includeNer && options.nerFindings ? options.nerFindings : [];

  const merged = dedupeOverlapping([...patterns, ...ner]);
  const mosaic = detectMosaicWarnings(text, [...merged, ...context]);

  return [...merged, ...context, ...mosaic].sort((a, b) => a.start - b.start);
}

const NER_TYPE_MAP = {
  PER: FINDING_TYPES.PERSON,
  PERSON: FINDING_TYPES.PERSON,
  B_PER: FINDING_TYPES.PERSON,
  I_PER: FINDING_TYPES.PERSON,
  ORG: FINDING_TYPES.ORGANIZATION,
  ORGANIZATION: FINDING_TYPES.ORGANIZATION,
  B_ORG: FINDING_TYPES.ORGANIZATION,
  I_ORG: FINDING_TYPES.ORGANIZATION,
  LOC: FINDING_TYPES.PLACE,
  LOCATION: FINDING_TYPES.PLACE,
  B_LOC: FINDING_TYPES.PLACE,
  I_LOC: FINDING_TYPES.PLACE,
  MISC: FINDING_TYPES.PLACE,
  B_MISC: FINDING_TYPES.PLACE,
  I_MISC: FINDING_TYPES.PLACE
};

/**
 * @param {string} entityLabel
 * @returns {{ base: string, isInside: boolean } | null}
 */
function parseBioLabel(entityLabel) {
  const label = entityLabel.replace(/^LABEL_/, '');
  if (label === 'O' || label === '0') return null;
  const bio = label.match(/^([BI])[-_](.+)$/);
  if (bio) return { base: bio[2], isInside: bio[1] === 'I' };
  return { base: label, isInside: false };
}

/**
 * Merge BIO-tagged and subword tokens into whole entities using model offsets.
 * @param {string} text
 * @param {Array<{ entity: string, word: string, start?: number, end?: number, score: number }>} tokens
 * @returns {Array<{ entity: string, word: string, start: number, end: number, score: number }>}
 */
export function mergeBioEntities(text, tokens) {
  const merged = [];
  let current = null;

  for (const tok of tokens) {
    const parsed = parseBioLabel(tok.entity);
    if (!parsed) {
      current = null;
      continue;
    }

    const mappedType = NER_TYPE_MAP[parsed.base] || NER_TYPE_MAP[tok.entity] || FINDING_TYPES.PERSON;
    let start = tok.start;
    let end = tok.end;
    if (start === undefined || end === undefined) {
      start = text.indexOf(tok.word, current?.end ?? 0);
      end = start + tok.word.length;
    }
    if (start < 0) continue;

    const continues = current &&
      mappedType === current.type &&
      (parsed.isInside || start <= current.end + 1);

    if (continues && current) {
      current.end = Math.max(current.end, end);
      current.text = text.slice(current.start, current.end);
      current.score = Math.max(current.score, tok.score);
    } else {
      if (current) merged.push(current);
      current = {
        entity: parsed.base,
        type: mappedType,
        start,
        end,
        text: text.slice(start, end),
        score: tok.score
      };
    }
  }
  if (current) merged.push(current);
  return merged;
}

/**
 * Convert NER token output to findings.
 * @param {string} text
 * @param {Array<{ entity: string, word: string, start?: number, end?: number, score: number }>} entities
 * @returns {import('./types.js').Finding[]}
 */
/**
 * Merge BIO entities, expand to whole words, then merge adjacent same-type spans.
 * @param {string} text
 * @param {Array<{ entity: string, word: string, start?: number, end?: number, score: number }>} tokens
 * @returns {Array<{ entity: string, type: string, start: number, end: number, text: string, score: number }>}
 */
export function expandAndMergeEntities(text, tokens) {
  const bioMerged = mergeBioEntities(text, tokens);
  const expanded = bioMerged.map((ent) => {
    const span = expandSpanToWordBoundaries(text, ent.start, ent.end);
    return {
      ...ent,
      start: span.start,
      end: span.end,
      text: span.text
    };
  });
  return mergeAdjacentSameType(expanded, text);
}

export function nerToFindings(text, entities) {
  let nid = 0;
  const findings = [];
  const spans = expandAndMergeEntities(text, entities);

  for (const ent of spans) {
    const entType = ent.type || NER_TYPE_MAP[ent.entity] || FINDING_TYPES.PERSON;
    const start = ent.start;
    const end = ent.end;
    if (start < 0 || end <= start) continue;
    nid += 1;
    const spanText = text.slice(start, end);
    findings.push({
      id: `n-${nid}`,
      start,
      end,
      text: spanText,
      type: entType,
      layer: 'ner',
      entityKey: `${entType}:${spanText.trim().toLowerCase()}`,
      action: 'pending'
    });
  }
  return findings;
}

/**
 * Merge overlapping: higher priority pattern over NER.
 * @param {import('./types.js').Finding[]} findings
 * @returns {import('./types.js').Finding[]}
 */
export function mergeFindings(findings) {
  return dedupeOverlapping(findings);
}
