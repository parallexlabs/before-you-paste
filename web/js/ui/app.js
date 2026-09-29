import { detectAll, nerToFindings } from '../core/detector.js';
import { buildPreparedText, validatePreparedText } from '../core/placeholders.js';
import { groupFindingsForDisplay } from '../core/findings-group.js';
import { generalizeFinding, canGeneralize } from '../core/generalize.js';
import { restoreReply, hasRestoreWarnings } from '../core/restore.js';
import { evaluatePermissions } from '../core/permissions.js';
import { checkInputLength, MAX_INPUT_CHARS } from '../core/input-limit.js';
import { appState, clearAll, setDirty } from './state.js';
import { t, loadLanguage, initLangSwitch, onLanguageChange, getLang } from './i18n.js';
import { badgeClass } from './icons.js';

let nerWorker = null;
let workerReqId = 0;
let activePredictId = 0;
let activeLoadId = 0;
/** @type {Record<string, { recall: string, n: number }> | null} */
let recallByCategory = null;
/** @type {boolean} */
let recallLoadFailed = false;
let restoreConfirmed = false;

const MODEL_REVISION = 'c2a4dbf593c57f47004c5bc2d3770d311aee9c43';
const MODEL_SIZE_BYTES = 135359829;

const VIEW_FOCUS = {
  'view-home': 'view-home-title',
  'view-permission': 'view-permission-title',
  'view-check': 'view-check-title',
  'view-review': 'view-review-title',
  'view-output': 'view-output-title',
  'view-restore': 'view-restore-title',
  'view-restore-review': 'view-restore-review-title'
};

function showView(id) {
  document.querySelectorAll('.view').forEach((v) => {
    v.hidden = v.id !== id;
  });
  const focusId = VIEW_FOCUS[id];
  const focusEl = focusId ? document.getElementById(focusId) : null;
  if (focusEl) {
    if (!focusEl.hasAttribute('tabindex')) focusEl.setAttribute('tabindex', '-1');
    focusEl.focus();
  }
}

function announce(msg) {
  const live = document.getElementById('live-region');
  if (live) live.textContent = msg;
}

function updateRunButtonLabel() {
  const btn = document.getElementById('btn-run-check');
  if (!btn) return;
  if (appState.nerEnabled && appState.nerStatus === 'ready') {
    btn.textContent = t('check.runPatternsAndNames');
  } else {
    btn.textContent = t('check.runPatterns');
  }
}

function updateStatus() {
  const el = document.getElementById('detection-status');
  if (!el) return;
  if (appState.nerStatus === 'ready' && appState.nerEnabled) {
    el.textContent = t('check.nerActive');
  } else if (appState.nerStatus === 'failed') {
    el.textContent = t('check.nerUnavailable');
  } else {
    el.textContent = t('check.patternOnly');
  }
  updateRunButtonLabel();
}

function applyDefaultActions() {
  for (const f of appState.findings) {
    if ((f.layer === 'pattern' || f.layer === 'ner') && (!f.action || f.action === 'pending')) {
      f.action = 'replace';
    }
  }
}

async function loadRecallStats() {
  if (recallByCategory && Object.keys(recallByCategory).length) return recallByCategory;
  if (recallLoadFailed) return null;
  try {
    const res = await fetch('data/eval-recall.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recallByCategory = {};
    for (const [cat, stats] of Object.entries(data.byCategory || {})) {
      recallByCategory[cat] = { recall: stats.recall, n: stats.n };
    }
    recallLoadFailed = false;
    return recallByCategory;
  } catch (err) {
    console.error('Recall stats load failed:', err);
    recallByCategory = null;
    recallLoadFailed = true;
    return null;
  }
}

function renderRecallPanel(findings) {
  const panel = document.getElementById('recall-panel');
  if (!panel) return;

  const count = findings.filter((f) => f.layer !== 'mosaic').length;
  let html = `<p class="incomplete-notice"><strong>${escapeHtml(t('review.incomplete', { count }))}</strong></p>`;
  html += `<p class="note">${escapeHtml(t('review.notAnonymous'))}</p>`;

  if (recallLoadFailed) {
    html += `<p class="note">${escapeHtml(t('review.recallLoadFailed'))}</p>`;
  } else if (recallByCategory && Object.keys(recallByCategory).length) {
    html += `<details><summary>${escapeHtml(t('review.recallTitle'))}</summary><table class="recall-table"><thead><tr><th>${escapeHtml(t('review.recallCategory'))}</th><th>${escapeHtml(t('review.recallMeasured'))}</th><th>n</th></tr></thead><tbody>`;
    for (const [cat, stats] of Object.entries(recallByCategory).sort(([a], [b]) => a.localeCompare(b))) {
      html += `<tr><td>${escapeHtml(t(`type.${cat}`) || cat)}</td><td>${escapeHtml(stats.recall)}</td><td>${stats.n}</td></tr>`;
    }
    html += '</tbody></table></details>';
  }

  panel.innerHTML = html;
}

function renderFindings() {
  const list = document.getElementById('finding-list');
  if (!list) return;
  list.innerHTML = '';

  applyDefaultActions();
  loadRecallStats().then(() => renderRecallPanel(appState.findings));

  if (!appState.findings.length) {
    list.innerHTML = `<li class="note">${escapeHtml(t('review.noFindings'))}</li>`;
    return;
  }

  const groups = groupFindingsForDisplay(appState.findings);

  for (const group of groups) {
    const f = group.representative;
    const li = document.createElement('li');
    li.className = `finding-item layer-${f.layer}`;
    li.dataset.id = f.id;
    if (group.count > 1) {
      li.dataset.groupIds = group.members.map((m) => m.id).join(',');
    }

    const typeLabel = t(`type.${f.type}`);
    const layerLabel = t(`layer.${f.layer}`);
    const countLabel = group.count > 1 ? ` <span class="occurrence-count">(${escapeHtml(t('review.occurrences', { count: group.count }))})</span>` : '';
    let explanation = '';
    if (f.layer === 'context' && f.category) {
      explanation = escapeHtml(t(`context.${f.category}`));
    }
    if (f.layer === 'mosaic' && f.explanationKey) {
      const items = f.mosaicItems?.length
        ? f.mosaicItems.map((item) => `"${item}"`).join(' and ')
        : f.text;
      explanation = escapeHtml(t(f.explanationKey, { items }));
      if (f.groupRisk) explanation += ` ${escapeHtml(t('mosaic.groupRisk'))}`;
    }

    const actionButtons = f.layer !== 'context' && f.layer !== 'mosaic' ? `
      <div class="btn-row" role="group" aria-label="${escapeHtml(typeLabel)}: ${escapeHtml(f.text)}">
        <button type="button" data-action="replace" data-id="${f.id}" aria-pressed="${f.action === 'replace'}">${escapeHtml(t('review.replace'))}</button>
        ${canGeneralize(f.type) ? `<button type="button" data-action="generalize" data-id="${f.id}" aria-pressed="${f.action === 'generalize'}">${escapeHtml(t('review.generalize'))}</button>` : ''}
        <button type="button" data-action="keep" data-id="${f.id}" aria-pressed="${f.action === 'keep'}">${escapeHtml(t('review.keep'))}</button>
      </div>` : `<p class="note">${escapeHtml(explanation)}</p>`;

    li.innerHTML = `
      <div class="finding-meta">
        <span class="badge ${badgeClass(f.layer)}"><span class="badge-icon" aria-hidden="true"></span>${escapeHtml(layerLabel)}</span>
        <span class="badge">${escapeHtml(typeLabel)}</span>
      </div>
      <code dir="auto">${escapeHtml(f.text)}</code>${countLabel}
      ${f.layer !== 'mosaic' && explanation ? `<p class="note">${explanation}</p>` : ''}
      ${actionButtons}
    `;
    list.appendChild(li);
  }

  list.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const li = btn.closest('.finding-item');
      const groupIds = li?.dataset.groupIds?.split(',') || [btn.dataset.id];
      const targets = appState.findings.filter((x) => groupIds.includes(x.id));
      const action = btn.dataset.action;
      for (const finding of targets) {
        finding.action = action;
        if (finding.action === 'generalize') {
          try {
            finding.generalizedText = generalizeFinding(finding, getLang());
          } catch {
            finding.action = 'replace';
            delete finding.generalizedText;
          }
        }
      }
      setDirty();
      renderFindings();
    });
  });

  renderHighlightedText();
  announce(t('a11y.results'));
}

function renderHighlightedText() {
  const el = document.getElementById('highlighted-text');
  if (!el || !appState.text) return;
  el.setAttribute('dir', 'auto');
  const parts = [];
  let cursor = 0;
  const sorted = [...appState.findings].filter((f) => f.layer !== 'mosaic').sort((a, b) => a.start - b.start);

  for (const f of sorted) {
    if (f.start > cursor) parts.push(escapeHtml(appState.text.slice(cursor, f.start)));
    const cls = `mark-${f.layer}`;
    const label = t(`type.${f.type}`);
    parts.push(`<mark class="${cls}" title="${escapeHtml(label)}">${escapeHtml(f.text)}</mark>`);
    cursor = f.end;
  }
  if (cursor < appState.text.length) parts.push(escapeHtml(appState.text.slice(cursor)));
  el.innerHTML = parts.join('');
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getPermissionAnswers() {
  const form = document.getElementById('permission-form');
  return {
    personalData: form?.querySelector('input[name="perm-personal"]:checked')?.value || 'unknown',
    toolApproved: form?.querySelector('input[name="perm-tool"]:checked')?.value || 'unknown',
    purposeAllowed: form?.querySelector('input[name="perm-purpose"]:checked')?.value || 'unknown'
  };
}

function showInputError(message) {
  const el = document.getElementById('input-error');
  if (el) {
    el.textContent = message;
    el.hidden = false;
  }
  announce(message);
}

function clearInputError() {
  const el = document.getElementById('input-error');
  if (el) el.hidden = true;
}

function runPatternDetection() {
  const input = document.getElementById('check-input');
  appState.text = input?.value || '';
  clearInputError();

  const lenCheck = checkInputLength(appState.text);
  if (!lenCheck.ok) {
    showInputError(t('check.inputTooLong', { max: MAX_INPUT_CHARS, length: lenCheck.length }));
    return;
  }

  setDirty();
  appState.findings = detectAll(appState.text);
  applyDefaultActions();

  if (appState.nerEnabled && appState.nerStatus === 'ready' && nerWorker) {
    const id = ++workerReqId;
    activePredictId = id;
    nerWorker.postMessage({ type: 'predict', text: appState.text, id });
  } else {
    showView('view-review');
    renderFindings();
  }
}

function mergeNerResults(entities, requestId) {
  if (requestId !== activePredictId) return;
  const nerFindings = nerToFindings(appState.text, entities);
  appState.findings = detectAll(appState.text, { includeNer: true, nerFindings });
  applyDefaultActions();
  showView('view-review');
  renderFindings();
}

function terminateNerWorker() {
  if (nerWorker) {
    nerWorker.terminate();
    nerWorker = null;
  }
}

function initNerWorker() {
  terminateNerWorker();
  nerWorker = new Worker('js/workers/ner-worker.js', { type: 'module' });
  const id = ++workerReqId;
  activeLoadId = id;
  const progressEl = document.getElementById('ner-progress');
  const progressFill = document.getElementById('ner-progress-fill');
  const progressText = document.getElementById('ner-progress-text');
  const progressBar = document.getElementById('ner-progress-bar');

  nerWorker.onmessage = (event) => {
    const data = event.data;
    if (data.type === 'progress' && data.id === activeLoadId) {
      const pct = data.percent;
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressBar) {
        progressBar.setAttribute('aria-valuenow', String(pct));
        progressBar.setAttribute('aria-valuetext', t('check.nerProgress', { percent: pct }));
      }
      if (progressText) progressText.textContent = t('check.nerProgress', { percent: pct });
    }
    if (data.type === 'ready' && data.id === activeLoadId) {
      appState.nerStatus = 'ready';
      appState.nerEnabled = true;
      if (progressEl) progressEl.hidden = true;
      updateStatus();
      const btn = document.getElementById('btn-enable-ner');
      if (btn) btn.textContent = t('check.nerReady');
      announce(t('check.nerReady'));
    }
    if (data.type === 'result') {
      mergeNerResults(data.entities, data.id);
    }
    if (data.type === 'error') {
      if (data.id !== activeLoadId && data.id !== activePredictId) return;
      if (data.message) console.error('Name recognition error:', data.message);
      appState.nerStatus = 'failed';
      appState.nerEnabled = false;
      if (progressEl) progressEl.hidden = true;
      updateStatus();
      announce(t('check.nerUnavailable'));
      showView('view-review');
      renderFindings();
    }
    if (data.type === 'cancelled' && data.id === activeLoadId) {
      if (progressEl) progressEl.hidden = true;
      appState.nerStatus = 'off';
      updateStatus();
      announce(t('check.nerCancelled'));
    }
  };

  if (progressEl) {
    progressEl.hidden = false;
    if (progressBar) {
      progressBar.setAttribute('aria-valuenow', '0');
      progressBar.setAttribute('aria-valuetext', t('check.nerProgress', { percent: 0 }));
    }
  }
  nerWorker.postMessage({ type: 'load', id });
}

async function copyToClipboard(text, successKey, failKey) {
  const fallback = document.getElementById('copy-fallback');
  try {
    await navigator.clipboard.writeText(text);
    announce(t(successKey));
    if (fallback) fallback.hidden = true;
  } catch {
    announce(t(failKey));
    if (fallback) {
      fallback.hidden = false;
      const ta = fallback.querySelector('textarea');
      if (ta) {
        ta.value = text;
        ta.focus();
        ta.select();
      }
    }
  }
}

function prepareOutput() {
  applyDefaultActions();
  const { text, map, counts } = buildPreparedText(appState.text, appState.findings);
  const violations = validatePreparedText(text, appState.findings);
  appState.preparedText = text;
  appState.placeholderMap = map;
  appState.prepareViolations = violations;

  const out = document.getElementById('prepared-output');
  const countsEl = document.getElementById('output-counts');
  const errorEl = document.getElementById('prepare-error');
  const copyBtn = document.getElementById('btn-copy');

  if (out) out.value = text;
  if (countsEl) countsEl.textContent = t('output.counts', counts);

  if (violations.length) {
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = violations
        .map((v) => t('output.invariantError', { text: v.text }))
        .join(' ');
    }
    if (copyBtn) copyBtn.disabled = true;
    announce(t('output.invariantBlocked'));
  } else {
    if (errorEl) errorEl.hidden = true;
    if (copyBtn) copyBtn.disabled = false;
  }

  showView('view-output');
  updateNamesNotCheckedNotice();
}

function namesRecognitionActive() {
  return appState.nerEnabled && appState.nerStatus === 'ready';
}

function updateNamesNotCheckedNotice() {
  const box = document.getElementById('names-not-checked');
  const textEl = document.getElementById('names-not-checked-text');
  const btn = document.getElementById('btn-enable-ner-output');
  if (!box || !textEl) return;
  const show = !namesRecognitionActive();
  box.hidden = !show;
  if (show) {
    textEl.textContent = t('output.namesNotChecked');
    if (btn) btn.textContent = t('output.enableNer');
  }
}

function renderRestoreComparison(comparison, issues, info) {
  const table = document.getElementById('restore-comparison');
  const issuesEl = document.getElementById('restore-issues');
  const infoEl = document.getElementById('restore-info');
  const confirmBox = document.getElementById('restore-confirm-box');
  const out = document.getElementById('restore-output');
  const copyBtn = document.getElementById('btn-copy-restored');

  if (table) {
    table.innerHTML = `<thead><tr><th>${escapeHtml(t('restore.line'))}</th><th>${escapeHtml(t('restore.replyCol'))}</th><th>${escapeHtml(t('restore.restoredCol'))}</th></tr></thead><tbody>` +
      comparison.map((row) =>
        `<tr class="${row.changed ? 'restore-changed' : ''}"><td>${row.line}</td><td><code dir="auto">${escapeHtml(row.reply)}</code></td><td><code dir="auto">${escapeHtml(row.original)}</code></td></tr>`
      ).join('') + '</tbody>';
  }

  const errors = issues.filter((i) => i.severity === 'error' || (!i.severity && i.issue !== 'unused'));
  if (issuesEl) {
    issuesEl.innerHTML = errors.length
      ? errors.map((i) => {
        const line = i.line ? ` (${escapeHtml(t('restore.onLine', { line: i.line }))})` : '';
        const raw = i.raw && i.raw !== i.placeholder ? `: ${escapeHtml(i.raw)}` : '';
        return `<li>${escapeHtml(i.placeholder)}${raw}: ${escapeHtml(t(`restore.issue.${i.issue}`))}${line}</li>`;
      }).join('')
      : `<li>${escapeHtml(t('restore.noIssues'))}</li>`;
  }

  if (infoEl) {
    infoEl.innerHTML = info.length
      ? info.map((i) => `<li>${escapeHtml(i.placeholder)}: ${escapeHtml(t(`restore.info.${i.issue}`))}</li>`).join('')
      : '';
    infoEl.hidden = !info.length;
  }

  restoreConfirmed = false;
  if (confirmBox) confirmBox.hidden = false;
  const checkbox = document.getElementById('restore-confirm');
  if (checkbox) checkbox.checked = false;
  if (out) {
    out.value = '';
    out.readOnly = true;
  }
  if (copyBtn) copyBtn.disabled = true;
}

function runRestore() {
  const reply = document.getElementById('restore-input')?.value || '';
  const { text, issues, info, comparison } = restoreReply(reply, appState.placeholderMap);
  appState.restoredText = text;
  appState.restoreIssues = issues;
  renderRestoreComparison(comparison, issues, info);
  showView('view-restore-review');
}

function confirmRestore() {
  const checkbox = document.getElementById('restore-confirm');
  const out = document.getElementById('restore-output');
  const copyBtn = document.getElementById('btn-copy-restored');
  if (!checkbox?.checked) return;
  restoreConfirmed = true;
  if (out) {
    out.value = appState.restoredText || '';
    out.readOnly = false;
  }
  if (copyBtn) copyBtn.disabled = false;
  announce(t('restore.confirmed'));
}

function addManualFinding() {
  const sel = window.getSelection();
  const selected = sel?.toString().trim();
  if (!selected || !appState.text) return;
  const start = appState.text.indexOf(selected);
  if (start < 0) return;
  const end = start + selected.length;
  appState.findings.push({
    id: `u-${Date.now()}`,
    start,
    end,
    text: selected,
    type: 'person',
    layer: 'pattern',
    action: 'replace',
    userAdded: true
  });
  setDirty();
  renderFindings();
}

function checkPermissionsAndProceed() {
  const result = evaluatePermissions(getPermissionAnswers());
  const blockedEl = document.getElementById('permission-blocked');
  if (!result.allowed) {
    if (blockedEl) {
      blockedEl.hidden = false;
      blockedEl.innerHTML = `
        <p>${escapeHtml(t(result.reasonKey))}</p>
        <p>${escapeHtml(t('permission.contact'))}</p>
        <ul>
          <li><a href="https://www.icrc.org/en/data-protection-humanitarian-action-handbook">${escapeHtml(t('home.source.icrc'))}</a></li>
          <li><a href="https://centre.humdata.org/revised-iasc-operational-guidance-on-data-responsibility-in-humanitarian-action/">${escapeHtml(t('home.source.iasc'))}</a></li>
        </ul>
        <button type="button" id="btn-perm-back">${escapeHtml(t('permission.back'))}</button>
      `;
      document.getElementById('btn-perm-back')?.addEventListener('click', () => {
        blockedEl.hidden = true;
        showView('view-home');
      });
      showView('view-permission');
    }
    return;
  }
  if (blockedEl) blockedEl.hidden = true;
  showView('view-check');
}

function cancelNerDownload() {
  if (nerWorker) nerWorker.postMessage({ type: 'cancel' });
  terminateNerWorker();
  const progressEl = document.getElementById('ner-progress');
  if (progressEl) progressEl.hidden = true;
  appState.nerStatus = 'off';
  appState.nerEnabled = false;
  updateStatus();
}

function initNavigation() {
  document.getElementById('btn-start-check')?.addEventListener('click', () => showView('view-permission'));
  document.getElementById('btn-perm-continue')?.addEventListener('click', checkPermissionsAndProceed);
  document.getElementById('btn-run-check')?.addEventListener('click', runPatternDetection);
  document.getElementById('btn-enable-ner')?.addEventListener('click', initNerWorker);
  document.getElementById('btn-enable-ner-output')?.addEventListener('click', () => {
    showView('view-check');
    initNerWorker();
  });
  document.getElementById('btn-cancel-ner')?.addEventListener('click', cancelNerDownload);
  document.getElementById('btn-prepare')?.addEventListener('click', prepareOutput);
  document.getElementById('btn-copy')?.addEventListener('click', () => {
    copyToClipboard(appState.preparedText, 'output.copied', 'output.copyFailed');
  });
  document.getElementById('btn-goto-restore')?.addEventListener('click', () => showView('view-restore'));
  document.getElementById('btn-run-restore')?.addEventListener('click', runRestore);
  document.getElementById('btn-confirm-restore')?.addEventListener('click', confirmRestore);
  document.getElementById('btn-copy-restored')?.addEventListener('click', () => {
    if (!restoreConfirmed) return;
    copyToClipboard(appState.restoredText || '', 'output.copied', 'output.copyFailed');
  });
  document.getElementById('btn-clear')?.addEventListener('click', () => {
    clearAll();
    document.querySelectorAll('textarea').forEach((ta) => { ta.value = ''; });
    showView('view-home');
    announce(t('restore.cleared'));
  });
  document.getElementById('btn-add-finding')?.addEventListener('click', addManualFinding);
  document.getElementById('btn-back-review')?.addEventListener('click', () => showView('view-review'));
  document.getElementById('btn-back-restore-input')?.addEventListener('click', () => showView('view-restore'));

  window.addEventListener('beforeunload', (e) => {
    if (appState.dirty) {
      e.preventDefault();
      e.returnValue = t('leave.warning');
    }
  });
}

function showModelInfo() {
  const el = document.getElementById('model-info');
  if (el) {
    const mb = (MODEL_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    el.textContent = t('check.modelPinned', { revision: MODEL_REVISION.slice(0, 8), size: mb });
  }
}

async function init() {
  await loadLanguage('en');
  initLangSwitch();
  onLanguageChange(() => {
    updateStatus();
    showModelInfo();
    if (!document.getElementById('view-review')?.hidden) renderFindings();
    if (!document.getElementById('view-output')?.hidden) updateNamesNotCheckedNotice();
  });
  initNavigation();
  updateStatus();
  showModelInfo();
  await loadRecallStats();
}

init();

export { hasRestoreWarnings };
