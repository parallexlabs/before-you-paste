/** @type {Record<string, Record<string, string>>} */
const bundles = Object.create(null);

/** @type {string} */
let currentLang = 'en';

/** @type {Set<() => void>} */
const langListeners = new Set();

/**
 * @param {string} lang
 */
export async function loadLanguage(lang) {
  if (!bundles[lang] || Object.keys(bundles[lang]).length === 0) {
    const res = await fetch(`i18n/${lang}.json`);
    const data = await res.json();
    bundles[lang] = Object.freeze({ ...data });
  }
  currentLang = lang;
  document.documentElement.lang = lang === 'fr' ? 'fr' : 'en';
  applyTranslations();
  for (const fn of langListeners) fn();
}

/**
 * @param {() => void} fn
 */
export function onLanguageChange(fn) {
  langListeners.add(fn);
}

/**
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
export function t(key, vars = {}) {
  if (typeof key !== 'string' || !key) return '';
  const bundle = bundles[currentLang] || bundles.en || {};
  const fallback = bundles.en || {};
  const str = Object.prototype.hasOwnProperty.call(bundle, key)
    ? bundle[key]
    : (Object.prototype.hasOwnProperty.call(fallback, key) ? fallback[key] : key);
  return String(str).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function getLang() {
  return currentLang;
}

export function getBundles() {
  return bundles;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.hasAttribute('placeholder')) el.placeholder = t(key);
    } else {
      el.textContent = t(key);
    }
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
  });
  const titleKey = document.querySelector('meta[name="i18n-title"]');
  if (titleKey) document.title = t(titleKey.getAttribute('content') || 'meta.title');

  document.querySelectorAll('.lang-notice-prominent').forEach((el) => {
    el.hidden = currentLang !== 'fr';
  });
  document.querySelectorAll('.lang-notice-footer').forEach((el) => {
    el.hidden = false;
  });
}

export function initLangSwitch() {
  const btn = document.getElementById('lang-switch');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = currentLang === 'en' ? 'fr' : 'en';
    loadLanguage(next);
    btn.textContent = t('lang.switch');
  });
}
