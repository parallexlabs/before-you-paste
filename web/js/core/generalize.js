/**
 * Finding types that support safe generalization.
 * @type {Set<string>}
 */
export const GENERALIZABLE_TYPES = new Set(['age', 'date_of_birth', 'place', 'address']);

const MONTH_NAMES = {
  en: {
    1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
    7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'
  },
  fr: {
    1: 'janvier', 2: 'février', 3: 'mars', 4: 'avril', 5: 'mai', 6: 'juin',
    7: 'juillet', 8: 'août', 9: 'septembre', 10: 'octobre', 11: 'novembre', 12: 'décembre'
  }
};

const NAMED_MONTH_RE = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|janv(?:ier)?|févr(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|août|sept(?:embre)?|oct(?:obre)?|nov(?:embre)?|déc(?:embre)?)\.?\b/i;

/**
 * @param {string} type
 * @returns {boolean}
 */
export function canGeneralize(type) {
  return GENERALIZABLE_TYPES.has(type);
}

/**
 * @param {string} lang
 * @returns {'en' | 'fr'}
 */
function normalizeLang(lang) {
  return lang === 'fr' ? 'fr' : 'en';
}

/**
 * @param {number} month
 * @param {'en' | 'fr'} lang
 * @returns {string}
 */
function formatMonthYear(month, year, lang) {
  const name = MONTH_NAMES[lang][month];
  return `${name} ${year}`;
}

/**
 * Generalize an age to an age band.
 * @param {string} ageText
 * @param {string} [lang='en']
 * @returns {string}
 */
export function generalizeAge(ageText, lang = 'en') {
  const l = normalizeLang(lang);
  const numMatch = ageText.match(/\d{1,3}/);
  if (!numMatch) return l === 'fr' ? '[TRANCHE D\'ÂGE]' : '[AGE BAND]';
  const age = parseInt(numMatch[0], 10);
  if (l === 'fr') {
    if (age < 18) return 'moins de 18 ans';
    if (age < 30) return '18-29 ans';
    if (age < 45) return '30-44 ans';
    if (age < 60) return '45-59 ans';
    return '60 ans et plus';
  }
  if (age < 18) return 'under 18';
  if (age < 30) return '18-29';
  if (age < 45) return '30-44';
  if (age < 60) return '45-59';
  return '60+';
}

/**
 * @param {string} token
 * @returns {number | null}
 */
function namedMonthToNumber(token) {
  const t = token.toLowerCase().replace(/\.$/, '');
  const map = {
    jan: 1, january: 1, janv: 1, janvier: 1,
    feb: 2, february: 2, févr: 2, fevrier: 2, février: 2,
    mar: 3, march: 3, mars: 3,
    apr: 4, april: 4, avr: 4, avril: 4,
    may: 5, mai: 5,
    jun: 6, june: 6, juin: 6,
    jul: 7, july: 7, juil: 7, juillet: 7,
    aug: 8, august: 8, août: 8, aout: 8,
    sep: 9, sept: 9, september: 9, septembre: 9,
    oct: 10, october: 10, octobre: 10,
    nov: 11, november: 11, novembre: 11,
    dec: 12, december: 12, déc: 12, decembre: 12, décembre: 12
  };
  return map[t] ?? null;
}

/**
 * Generalize a date to month and year, or year only when ambiguous.
 * @param {string} dateText
 * @param {string} [lang='en']
 * @returns {string}
 */
export function generalizeDate(dateText, lang = 'en') {
  const l = normalizeLang(lang);
  const fallback = l === 'fr' ? '[MOIS ET ANNÉE]' : '[MONTH YEAR]';

  const named = dateText.match(new RegExp(`(?:\\d{1,2}\\s+)?(${NAMED_MONTH_RE.source})\\s+(\\d{4})`, 'i'));
  if (named) {
    const month = namedMonthToNumber(named[1]);
    const year = named[2];
    if (month) return formatMonthYear(month, year, l);
  }

  const iso = dateText.match(/\b(\d{4})[/.-](\d{1,2})(?:[/.-](\d{1,2}))?\b/);
  if (iso) {
    const year = parseInt(iso[1], 10);
    const month = parseInt(iso[2], 10);
    if (month >= 1 && month <= 12) return formatMonthYear(month, year, l);
    return String(year);
  }

  const numeric = dateText.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/);
  if (numeric) {
    const a = parseInt(numeric[1], 10);
    const b = parseInt(numeric[2], 10);
    const year = numeric[3];
    let month = null;

    if (a > 12 && b >= 1 && b <= 12) {
      month = b;
    } else if (b > 12 && a >= 1 && a <= 12) {
      month = a;
    } else if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      return year;
    }

    if (month) return formatMonthYear(month, year, l);
    return year;
  }

  const yearOnly = dateText.match(/\b(19|20)\d{2}\b/);
  if (yearOnly) return yearOnly[0];

  return fallback;
}

/**
 * Generalize a small place to a neutral category without the original name.
 * @param {string} _placeText
 * @param {string} [lang='en']
 * @returns {string}
 */
export function generalizePlace(_placeText, lang = 'en') {
  return normalizeLang(lang) === 'fr' ? 'une localité de la région' : 'a town in the area';
}

/**
 * Apply generalization based on finding type.
 * @param {import('./types.js').Finding} finding
 * @param {string} [lang='en']
 * @returns {string}
 * @throws {Error} when type does not support generalization
 */
export function generalizeFinding(finding, lang = 'en') {
  if (!canGeneralize(finding.type)) {
    throw new Error(`Generalization is not supported for type: ${finding.type}`);
  }
  switch (finding.type) {
    case 'age':
      return generalizeAge(finding.text, lang);
    case 'date_of_birth':
      return generalizeDate(finding.text, lang);
    case 'place':
    case 'address':
      return generalizePlace(finding.text, lang);
    default:
      throw new Error(`Generalization is not supported for type: ${finding.type}`);
  }
}
