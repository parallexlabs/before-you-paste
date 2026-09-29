import { FINDING_TYPES } from './types.js';
import { ibanValid, sinValid, cardValid, ipValid, imeiValid, mrzLine2Valid, e164Valid } from './validators.js';
import { normalizeDigits } from './normalize.js';

let idCounter = 0;

/**
 * @param {string} type
 * @param {number} start
 * @param {number} end
 * @param {string} text
 * @returns {import('./types.js').Finding}
 */
function makeFinding(type, start, end, text) {
  idCounter += 1;
  return {
    id: `p-${idCounter}`,
    start,
    end,
    text,
    type,
    layer: 'pattern',
    action: 'pending'
  };
}

/**
 * @param {string} text
 * @param {RegExp} regex
 * @param {string} type
 * @param {(match: RegExpExecArray) => boolean} [validate]
 * @returns {import('./types.js').Finding[]}
 */
function scanRegex(text, regex, type, validate) {
  const findings = [];
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  let match;
  while ((match = re.exec(text)) !== null) {
    const matched = match[0];
    if (validate && !validate(match)) continue;
    findings.push(makeFinding(type, match.index, match.index + matched.length, matched));
  }
  return findings;
}

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

const E164_RE = /\+[1-9]\d{7,14}\b/g;

const PHONE_INTL_NA_RE = /\+\d{1,3}[\s.-]?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g;

const PHONE_NA_RE = /(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g;

const STREET_EN = /\b\d{1,5}\s+[A-Za-zÀ-ÿ][\wÀ-ÿ.'-]*(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ.'-]*){0,4}\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Court|Ct\.?|Way|Crescent|Cres\.?|Place|Pl\.?)\b/gi;

const STREET_FR = /\b\d{1,5}[,]?\s+(?:rue|avenue|boulevard|chemin|place|allée|impasse)\s+(?:de\s+(?:la|l'|le|les)\s+)?[A-Za-zÀ-ÿ][\wÀ-ÿ.'-]*(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ.'-]*){0,5}\b/gi;

const CAMP_ADDRESS_RE = /\b(?:Block|Bloc|Secteur|Sector)\s+[A-Z0-9]+,?\s+(?:Shelter|Abri)\s+\d+\b/gi;

const POSTAL_CA = /\b[A-Za-z]\d[A-Za-z][\s-]?\d[A-Za-z]\d\b/g;

const DOB_CONTEXT = /\b(?:born|DOB|date of birth|d\.?o\.?b\.?|né\s+le|née\s+le|date\s+de\s+naissance)\b/gi;

const MONTH = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|janv(?:ier)?|févr(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|août|sept(?:embre)?|oct(?:obre)?|nov(?:embre)?|déc(?:embre)?';

const DATE_PATTERNS = [
  /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g,
  /\b\d{4}[/.-]\d{1,2}[/.-]\d{1,2}\b/g,
  new RegExp(`\\b\\d{1,2}\\s+(?:${MONTH})\\.?\\s+\\d{4}\\b`, 'gi'),
  new RegExp(`\\b(?:${MONTH})\\.?\\s+\\d{1,2},?\\s+\\d{4}\\b`, 'gi')
];

const AGE_RE = /\b(?:age[d]?\s+(\d{1,3})|(\d{1,3})\s*years?\s+old|(\d{1,3})\s*y\.?o\.?)\b/gi;
const AGE_FR_RE = /(?:âgé[e]?\s+de\s+(\d{1,3})\s+ans?|(\d{1,3})\s+ans?\s+d'age)/gi;

const GPS_DECIMAL = /\b-?\d{1,3}\.\d{3,},\s*-?\d{1,3}\.\d{3,}\b/g;

const GPS_DMS = /\b\d{1,3}°\s*\d{1,2}['′]\s*\d{1,2}(?:\.\d+)?["″]?\s*[NS]\s*,?\s*\d{1,3}°\s*\d{1,2}['′]\s*\d{1,2}(?:\.\d+)?["″]?\s*[EW]\b/gi;

/**
 * @param {string} coordText
 * @returns {boolean}
 */
export function gpsDecimalValid(coordText) {
  const parts = coordText.split(/,\s*/);
  if (parts.length !== 2) return false;
  const lat = parseFloat(parts[0]);
  const lon = parseFloat(parts[1]);
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * @param {RegExpExecArray} match
 * @returns {boolean}
 */
export function gpsDmsValid(match) {
  const text = match[0];
  const latMatch = text.match(/(\d{1,3})°\s*(\d{1,2})['′]\s*(\d{1,2}(?:\.\d+)?)["″]?\s*([NS])/i);
  const lonMatch = text.match(/(\d{1,3})°\s*(\d{1,2})['′]\s*(\d{1,2}(?:\.\d+)?)["″]?\s*([EW])/i);
  if (!latMatch || !lonMatch) return false;
  const latDeg = parseInt(latMatch[1], 10);
  const latMin = parseInt(latMatch[2], 10);
  const latSec = parseFloat(latMatch[3]);
  const lonDeg = parseInt(lonMatch[1], 10);
  const lonMin = parseInt(lonMatch[2], 10);
  const lonSec = parseFloat(lonMatch[3]);
  if (latMin > 59 || latSec >= 60 || lonMin > 59 || lonSec >= 60) return false;
  let lat = latDeg + latMin / 60 + latSec / 3600;
  let lon = lonDeg + lonMin / 60 + lonSec / 3600;
  if (latMatch[4].toUpperCase() === 'S') lat = -lat;
  if (lonMatch[4].toUpperCase() === 'W') lon = -lon;
  return lat >= 0 && lat <= 90 && lon >= 0 && lon <= 180;
}

const IP_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

const CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g;

const SIN_RE = /\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/g;

const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi;

const IMEI_RE = /\b\d{2}[\s-]?\d{6}[\s-]?\d{6}[\s-]?\d\b|\b\d{15}\b/g;

const MRZ_LINE2_RE = /\b[A-Z0-9<]{9}\d[A-Z]{3}\d{6}\d[A-Z]\d{6}\d[A-Z0-9<]{14}\d\d\b/g;

const ID_KEYWORDS = /\b(?:passport|passeport|case\s*(?:no\.?|number|#)|dossier\s*(?:no\.?|n°|#)?|file\s*(?:no\.?|number|#)|registration\s*(?:no\.?|number|#)|numéro\s+de\s+dossier|n°\s+de\s+dossier|référence)\b/gi;

const ID_VALUE = /\b[A-Z]{1,2}\d{6,9}\b|\b\d{4}-[A-Z]{2,6}-\d{3,6}\b|\b\d{6,12}[A-Z]?\b/g;

/**
 * Reset internal ID counter (for tests).
 */
export function resetPatternIds() {
  idCounter = 0;
}

/**
 * @param {string} text
 * @returns {import('./types.js').Finding[]}
 */
export function detectPatterns(text) {
  resetPatternIds();
  const normalized = normalizeDigits(text);
  const findings = [];

  findings.push(...scanRegex(text, EMAIL_RE, FINDING_TYPES.EMAIL));

  findings.push(...scanRegex(text, PHONE_INTL_NA_RE, FINDING_TYPES.PHONE, (m) => {
    const digits = m[0].replace(/\D/g, '');
    return digits.length >= 11 && digits.length <= 15;
  }));

  findings.push(...scanRegex(normalized, E164_RE, FINDING_TYPES.PHONE, (m) => e164Valid(m[0])));

  findings.push(...scanRegex(normalized, PHONE_NA_RE, FINDING_TYPES.PHONE, (m) => {
    const digits = m[0].replace(/\D/g, '');
    return digits.length === 10;
  }));

  findings.push(...scanRegex(text, CAMP_ADDRESS_RE, FINDING_TYPES.CAMP_ADDRESS));

  findings.push(...scanRegex(text, STREET_EN, FINDING_TYPES.ADDRESS));
  findings.push(...scanRegex(text, STREET_FR, FINDING_TYPES.ADDRESS));

  findings.push(...scanRegex(text, POSTAL_CA, FINDING_TYPES.POSTAL_CODE, (m) => {
    const c = m[0].replace(/\s|-/g, '').toUpperCase();
    return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(c);
  }));

  const dobContexts = [];
  let dobMatch;
  const dobCtxRe = new RegExp(DOB_CONTEXT.source, 'gi');
  while ((dobMatch = dobCtxRe.exec(text)) !== null) {
    dobContexts.push(dobMatch.index);
  }
  for (const dateRe of DATE_PATTERNS) {
    const re = new RegExp(dateRe.source, dateRe.flags.includes('g') ? dateRe.flags : `${dateRe.flags}g`);
    let dm;
    while ((dm = re.exec(text)) !== null) {
      const near = dobContexts.some((idx) => Math.abs(dm.index - idx) < 40);
      if (near) {
        findings.push(makeFinding(FINDING_TYPES.DATE_OF_BIRTH, dm.index, dm.index + dm[0].length, dm[0]));
      }
    }
  }

  const ageRe = new RegExp(AGE_RE.source, 'gi');
  let am;
  while ((am = ageRe.exec(text)) !== null) {
    const ageNum = parseInt(am[1] || am[2] || am[3] || '', 10);
    if (ageNum > 0 && ageNum <= 120) {
      findings.push(makeFinding(FINDING_TYPES.AGE, am.index, am.index + am[0].length, am[0]));
    }
  }
  const ageFrRe = new RegExp(AGE_FR_RE.source, 'gi');
  while ((am = ageFrRe.exec(text)) !== null) {
    const ageNum = parseInt(am[1] || am[2] || '', 10);
    if (ageNum > 0 && ageNum <= 120) {
      findings.push(makeFinding(FINDING_TYPES.AGE, am.index, am.index + am[0].length, am[0]));
    }
  }

  findings.push(...scanRegex(text, GPS_DECIMAL, FINDING_TYPES.GPS, (m) => gpsDecimalValid(m[0])));
  findings.push(...scanRegex(text, GPS_DMS, FINDING_TYPES.GPS, (m) => gpsDmsValid(m)));

  findings.push(...scanRegex(normalized, IP_RE, FINDING_TYPES.IP, (m) => ipValid(m[0])));

  findings.push(...scanRegex(normalized, IMEI_RE, FINDING_TYPES.IMEI, (m) => imeiValid(m[0])));

  findings.push(...scanRegex(normalized, CARD_RE, FINDING_TYPES.PAYMENT_CARD, (m) => {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length === 15 && imeiValid(digits)) return false;
    return cardValid(m[0]);
  }));

  findings.push(...scanRegex(normalized, SIN_RE, FINDING_TYPES.SIN, (m) => sinValid(m[0])));

  findings.push(...scanRegex(text, IBAN_RE, FINDING_TYPES.IBAN, (m) => ibanValid(m[0])));

  findings.push(...scanRegex(text, MRZ_LINE2_RE, FINDING_TYPES.PASSPORT_MRZ, (m) => mrzLine2Valid(m[0])));

  const kwRe = new RegExp(ID_KEYWORDS.source, 'gi');
  let km;
  while ((km = kwRe.exec(text)) !== null) {
    const windowStart = km.index;
    const windowEnd = Math.min(text.length, km.index + km[0].length + 30);
    const slice = text.slice(windowStart, windowEnd);
    const valRe = new RegExp(ID_VALUE.source, 'g');
    let vm;
    while ((vm = valRe.exec(slice)) !== null) {
      const absStart = windowStart + vm.index;
      const absEnd = absStart + vm[0].length;
      const val = vm[0];
      if (val.length < 6) continue;
      if (/^\d{4}$/.test(val)) continue;
      findings.push(makeFinding(FINDING_TYPES.ID_NUMBER, absStart, absEnd, val));
    }
  }

  return dedupeOverlapping(findings);
}

/**
 * @param {import('./types.js').Finding[]} findings
 * @returns {import('./types.js').Finding[]}
 */
export function dedupeOverlapping(findings) {
  const sorted = [...findings].sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = [];
  for (const f of sorted) {
    const overlap = kept.find((k) => f.start < k.end && f.end > k.start);
    if (!overlap) kept.push(f);
  }
  return kept.sort((a, b) => a.start - b.start);
}
