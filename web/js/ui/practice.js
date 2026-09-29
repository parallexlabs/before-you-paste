import { detectAll } from '../core/detector.js';
import { t, loadLanguage, initLangSwitch, onLanguageChange } from './i18n.js';

/** @type {Array<{ id: string, lang: string, text: string, titleKey: string, wrongUse?: boolean, correctAction?: string, answerKey: Array<{ text: string, type: string, action: string, reasonKey: string }> }>} */
let passages = [];

/** @type {Set<string>} */
let userMarks = new Set();

let currentPassage = null;

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderPassageList() {
  const list = document.getElementById('passage-list');
  if (!list) return;
  list.innerHTML = '';
  for (const p of passages) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = t(p.titleKey);
    btn.addEventListener('click', () => selectPassage(p.id));
    li.appendChild(btn);
    list.appendChild(li);
  }
}

function selectPassage(id) {
  currentPassage = passages.find((p) => p.id === id);
  userMarks = new Set();
  const textEl = document.getElementById('practice-text');
  const resultsEl = document.getElementById('practice-results');
  const wrongUseEl = document.getElementById('wrong-use-actions');
  if (textEl) textEl.textContent = currentPassage?.text || '';
  if (resultsEl) resultsEl.hidden = true;
  if (wrongUseEl) {
    wrongUseEl.hidden = !currentPassage?.wrongUse;
    wrongUseEl.querySelectorAll('input').forEach((inp) => { inp.checked = false; });
  }
  const detail = document.getElementById('view-practice-detail');
  if (detail) detail.hidden = false;
}

function markSelection() {
  const textEl = document.getElementById('practice-text');
  if (!textEl || !currentPassage) return;
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  const selected = sel.toString().trim();
  if (selected) userMarks.add(selected.toLowerCase());
}

function revealResults() {
  if (!currentPassage) return;
  const resultsEl = document.getElementById('practice-results');
  if (!resultsEl) return;

  if (currentPassage.wrongUse) {
    const choice = document.querySelector('#wrong-use-actions input:checked')?.value;
    const correct = choice === 'do_not_paste';
    resultsEl.innerHTML = `
      <h3>${escapeHtml(t('practice.wrongUse.correct'))}</h3>
      <p class="${correct ? 'note' : 'warning'}">${correct ? '✓' : '✗'} ${escapeHtml(t('practice.wrongUse.explain'))}</p>
      <p>${escapeHtml(t('practice.wrongUse.debrief'))}</p>
      <h3>${escapeHtml(t('practice.caught'))}</h3>
      <ul>${currentPassage.answerKey.map((k) => `<li><strong>${escapeHtml(k.text)}</strong>: ${escapeHtml(t(k.reasonKey))}</li>`).join('')}</ul>
    `;
    resultsEl.hidden = false;
    return;
  }

  const labFindings = detectAll(currentPassage.text);
  const caught = [];
  const missed = [];

  for (const key of currentPassage.answerKey) {
    const userGot = userMarks.has(key.text.toLowerCase()) ||
      [...userMarks].some((m) => key.text.toLowerCase().includes(m) || m.includes(key.text.toLowerCase()));
    if (userGot) caught.push(key);
    else missed.push(key);
  }

  const labExtra = [];
  for (const f of labFindings) {
    const inKey = currentPassage.answerKey.some((k) =>
      f.text.toLowerCase().includes(k.text.toLowerCase()) || k.text.toLowerCase().includes(f.text.toLowerCase())
    );
    if (!inKey && f.layer !== 'mosaic') labExtra.push(f);
  }

  resultsEl.innerHTML = `
    <h3>${escapeHtml(t('practice.caught'))}</h3>
    <ul>${caught.map((k) => `<li><strong>${escapeHtml(k.text)}</strong>: ${escapeHtml(t(k.reasonKey))}</li>`).join('') || '<li>None</li>'}</ul>
    <h3>${escapeHtml(t('practice.missed'))}</h3>
    <ul>${missed.map((k) => `<li><strong>${escapeHtml(k.text)}</strong>: ${escapeHtml(t(k.reasonKey))}</li>`).join('') || '<li>None</li>'}</ul>
    <h3>${escapeHtml(t('practice.labCaught'))}</h3>
    <ul>${labExtra.map((f) => `<li>${escapeHtml(f.text)} (${escapeHtml(t(`type.${f.type}`))})</li>`).join('') || '<li>None</li>'}</ul>
    <p><strong>${escapeHtml(t('practice.debrief'))}</strong></p>
  `;
  resultsEl.hidden = false;
}

async function init() {
  await loadLanguage('en');
  initLangSwitch();
  onLanguageChange(() => renderPassageList());
  const res = await fetch('data/practice.json');
  const data = await res.json();
  passages = data.passages;
  renderPassageList();
  document.getElementById('btn-mark')?.addEventListener('click', markSelection);
  document.getElementById('btn-reveal')?.addEventListener('click', revealResults);
}

init();
