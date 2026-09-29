/**
 * Whether a character can belong to a name or place token.
 * @param {string} text
 * @param {number} index
 * @returns {boolean}
 */
export function isNameWordChar(text, index) {
  if (index < 0 || index >= text.length) return false;
  const ch = text[index];
  if (/[\p{L}\p{N}]/u.test(ch)) return true;
  if (ch === '-' || ch === '\u2019' || ch === "'") {
    const prev = index > 0 ? text[index - 1] : '';
    const next = index + 1 < text.length ? text[index + 1] : '';
    return /[\p{L}\p{N}]/u.test(prev) && /[\p{L}\p{N}]/u.test(next);
  }
  return false;
}

/**
 * Expand a character span to full word boundaries in the source text.
 * @param {string} text
 * @param {number} start
 * @param {number} end
 * @returns {{ start: number, end: number, text: string }}
 */
export function expandSpanToWordBoundaries(text, start, end) {
  let s = Math.max(0, start);
  let e = Math.min(text.length, end);
  while (s > 0 && isNameWordChar(text, s - 1)) s -= 1;
  while (e < text.length && isNameWordChar(text, e)) e += 1;
  return { start: s, end: e, text: text.slice(s, e) };
}

/**
 * Merge adjacent spans of the same type, allowing a single separator character.
 * @param {Array<{ type: string, start: number, end: number, text: string, score: number, entity: string }>} spans
 * @param {string} text
 * @returns {Array<{ type: string, start: number, end: number, text: string, score: number, entity: string }>}
 */
export function mergeAdjacentSameType(spans, text) {
  if (!spans.length) return [];
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = sorted[i];
    const gap = text.slice(prev.end, cur.start);
    const adjacent = cur.start <= prev.end + 1 || (gap.length <= 1 && /^\s*$/.test(gap));

    if (cur.type === prev.type && adjacent) {
      prev.end = Math.max(prev.end, cur.end);
      prev.text = text.slice(prev.start, prev.end);
      prev.score = Math.max(prev.score, cur.score);
    } else {
      merged.push(cur);
    }
  }

  return merged;
}
