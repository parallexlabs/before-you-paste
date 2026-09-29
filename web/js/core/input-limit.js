/** Maximum characters accepted for pattern scan and NER. */
export const MAX_INPUT_CHARS = 50_000;

/**
 * @param {string} text
 * @returns {{ ok: boolean, length: number }}
 */
export function checkInputLength(text) {
  const length = text.length;
  return { ok: length <= MAX_INPUT_CHARS, length };
}
