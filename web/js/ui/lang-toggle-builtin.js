const btn = document.getElementById('lang-switch');
const en = document.getElementById('content-en');
const fr = document.getElementById('content-fr');
let lang = 'en';
btn?.addEventListener('click', () => {
  lang = lang === 'en' ? 'fr' : 'en';
  document.documentElement.lang = lang;
  btn.textContent = lang === 'en' ? 'Français' : 'English';
  if (en) en.hidden = lang !== 'en';
  if (fr) fr.hidden = lang !== 'fr';
});
