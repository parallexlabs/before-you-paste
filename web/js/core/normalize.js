const EASTERN_ARABIC = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN = '۰۱۲۳۴۵۶۷۸۹';

/**
 * Replace Eastern Arabic and Persian digits with Western digits.
 * @param {string} text
 * @returns {string}
 */
export function normalizeDigits(text) {
  let out = '';
  for (const ch of text) {
    const ea = EASTERN_ARABIC.indexOf(ch);
    if (ea >= 0) {
      out += String(ea);
      continue;
    }
    const pe = PERSIAN.indexOf(ch);
    if (pe >= 0) {
      out += String(pe);
      continue;
    }
    out += ch;
  }
  return out;
}
