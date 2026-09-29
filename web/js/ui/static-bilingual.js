import { loadLanguage, initLangSwitch, onLanguageChange, getLang } from './i18n.js';

const en = document.getElementById('content-en');
const fr = document.getElementById('content-fr');

function syncContentPanels() {
  const lang = getLang();
  if (en) en.hidden = lang !== 'en';
  if (fr) fr.hidden = lang !== 'fr';
}

onLanguageChange(syncContentPanels);

await loadLanguage('en');
initLangSwitch();
syncContentPanels();
