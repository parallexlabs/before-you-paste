/**
 * Escape a string for use in a RegExp.
 * @param {string} s
 * @returns {string}
 */
export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Unicode letter or digit (boundary). */
const WB_BEFORE = '(?<![\\p{L}\\p{N}])';
const WB_AFTER = '(?![\\p{L}\\p{N}])';

/**
 * Build a case-insensitive whole-phrase regex with Unicode word boundaries.
 * @param {string} phrase
 * @returns {RegExp}
 */
export function wholePhraseRegex(phrase) {
  const escaped = escapeRegex(phrase.trim()).replace(/\s+/g, '\\s+');
  return new RegExp(`${WB_BEFORE}${escaped}${WB_AFTER}`, 'giu');
}

/**
 * Find all non-overlapping whole-phrase matches in text.
 * @param {string} text
 * @param {string} phrase
 * @returns {Array<{ start: number, end: number, text: string }>}
 */
export function findWholePhraseMatches(text, phrase) {
  if (!phrase.trim()) return [];
  const re = wholePhraseRegex(phrase);
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    if (m[0].length === 0) re.lastIndex += 1;
  }
  return out;
}

/**
 * Replace every whole-phrase match (case-insensitive) in text.
 * @param {string} text
 * @param {string} phrase
 * @param {string} replacement
 * @returns {{ text: string, count: number }}
 */
export function replaceAllPhrases(text, phrase, replacement) {
  const re = wholePhraseRegex(phrase);
  let count = 0;
  const out = text.replace(re, () => {
    count += 1;
    return replacement;
  });
  return { text: out, count };
}
