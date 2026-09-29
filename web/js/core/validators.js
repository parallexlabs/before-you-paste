/**
 * Luhn checksum for payment cards and Canadian SIN.
 * @param {string} digits
 * @returns {boolean}
 */
export function luhnCheck(digits) {
  const nums = digits.replace(/\D/g, '');
  if (nums.length < 2) return false;
  let sum = 0;
  let alt = false;
  for (let i = nums.length - 1; i >= 0; i--) {
    let n = parseInt(nums[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * IBAN mod-97 validation.
 * @param {string} iban
 * @returns {boolean}
 */
export function ibanValid(iban) {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(cleaned)) return false;
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  let expanded = '';
  for (const ch of rearranged) {
    expanded += /[A-Z]/.test(ch) ? (ch.charCodeAt(0) - 55).toString() : ch;
  }
  let remainder = 0;
  for (const ch of expanded) {
    remainder = (remainder * 10 + parseInt(ch, 10)) % 97;
  }
  return remainder === 1;
}

/**
 * Canadian SIN: 9 digits, Luhn valid, not all same digit.
 * @param {string} sin
 * @returns {boolean}
 */
export function sinValid(sin) {
  const digits = sin.replace(/\D/g, '');
  if (digits.length !== 9) return false;
  if (/^(\d)\1{8}$/.test(digits)) return false;
  return luhnCheck(digits);
}

/**
 * Payment card: 13-19 digits, Luhn valid.
 * @param {string} card
 * @returns {boolean}
 */
export function cardValid(card) {
  const digits = card.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  return luhnCheck(digits);
}

/**
 * IPv4 validation.
 * @param {string} ip
 * @returns {boolean}
 */
export function ipValid(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = parseInt(p, 10);
    return n >= 0 && n <= 255;
  });
}

/**
 * IMEI: 15 digits, Luhn-valid (ICAO-style check on digit string).
 * @param {string} imei
 * @returns {boolean}
 */
export function imeiValid(imei) {
  const digits = imei.replace(/\D/g, '');
  if (digits.length !== 15) return false;
  if (/^(\d)\1{14}$/.test(digits)) return false;
  return luhnCheck(digits);
}

/**
 * ICAO Doc 9303 MRZ character value (0-9, A-Z, filler <).
 * @param {string} ch
 * @returns {number}
 */
function mrzCharValue(ch) {
  if (ch === '<') return 0;
  if (/[0-9]/.test(ch)) return parseInt(ch, 10);
  if (/[A-Z]/.test(ch)) return ch.charCodeAt(0) - 55;
  return -1;
}

/**
 * ICAO Doc 9303 check digit for a field (weights 7, 3, 1 repeating).
 * @param {string} field
 * @returns {number}
 */
export function mrzCheckDigit(field) {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < field.length; i++) {
    const v = mrzCharValue(field[i]);
    if (v < 0) return -1;
    sum += v * weights[i % 3];
  }
  return sum % 10;
}

/**
 * Validate TD3 passport MRZ line 2 check digits (Doc 9303 Part 3).
 * @param {string} line
 * @returns {boolean}
 */
export function mrzLine2Valid(line) {
  const l = line.replace(/\s/g, '').toUpperCase();
  if (l.length !== 44) return false;
  if (!/^[A-Z0-9<]+$/.test(l)) return false;

  const docNum = l.slice(0, 9);
  const docCheck = parseInt(l[9], 10);
  if (mrzCheckDigit(docNum) !== docCheck) return false;

  const dob = l.slice(13, 19);
  const dobCheck = parseInt(l[19], 10);
  if (mrzCheckDigit(dob) !== dobCheck) return false;

  const expiry = l.slice(21, 27);
  const expiryCheck = parseInt(l[27], 10);
  if (mrzCheckDigit(expiry) !== expiryCheck) return false;

  const personal = l.slice(28, 42);
  const personalCheck = l[42];
  const personalExpected = mrzCheckDigit(personal);
  const personalAllFiller = /^<+$/.test(personal);
  if (personalAllFiller) {
    if (personalCheck !== '<' && parseInt(personalCheck, 10) !== personalExpected) return false;
  } else if (personalCheck === '<' || parseInt(personalCheck, 10) !== personalExpected) {
    return false;
  }

  const composite = l.slice(0, 10) + l.slice(13, 20) + l.slice(21, 43);
  const compositeCheck = parseInt(l[43], 10);
  if (mrzCheckDigit(composite) !== compositeCheck) return false;

  return true;
}

/**
 * E.164 phone: optional +, 8-15 digits total.
 * @param {string} phone
 * @returns {boolean}
 */
export function e164Valid(phone) {
  const cleaned = phone.replace(/[\s().-]/g, '');
  if (!/^\+?\d{8,15}$/.test(cleaned)) return false;
  const digits = cleaned.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}
