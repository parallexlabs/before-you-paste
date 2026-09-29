const EXACT_PLACEHOLDER_RE = /\[[A-Z]+ \d+\]/g;
const MERGED_PLACEHOLDER_RE = /\[[A-Z]+ \d+(?:\s*(?:,|and|&|or)\s+(?:(?:[A-Z]+ )?\d+))+\]/gi;
const LOOSE_BRACKET_RE = /\[\s*([A-Za-z]+)\s+(\d+)\s*\]/g;
const LOOSE_WORD_RE = /\b([A-Za-z]+)\s+(\d+)\b/g;
const LOOSE_COMPACT_RE = /\b([A-Za-z]+)(\d+)\b/g;

const TYPE_WORDS = new Set([
  'EMAIL', 'PHONE', 'PLACE', 'ORG', 'ORGANIZATION', 'PERSON', 'ID', 'CARD', 'SIN',
  'GPS', 'DOB', 'AGE', 'IP', 'IBAN', 'IMEI', 'MRZ', 'CAMP', 'POSTAL', 'ITEM'
]);

const TYPE_NORMALIZE = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  PLACE: 'PLACE',
  ORG: 'ORG',
  ORGANIZATION: 'ORG',
  PERSON: 'PERSON',
  ID: 'ID',
  CARD: 'CARD',
  SIN: 'SIN',
  GPS: 'GPS',
  DOB: 'DOB',
  AGE: 'AGE',
  IP: 'IP',
  IBAN: 'IBAN',
  IMEI: 'IMEI',
  MRZ: 'MRZ',
  CAMP: 'CAMP',
  POSTAL: 'POSTAL',
  ITEM: 'ITEM'
};

/**
 * @param {string} typeWord
 * @param {string} num
 * @returns {string | null}
 */
function canonicalPlaceholder(typeWord, num) {
  const upper = typeWord.toUpperCase();
  if (!TYPE_WORDS.has(upper)) return null;
  const prefix = TYPE_NORMALIZE[upper] || upper;
  return `[${prefix} ${num}]`;
}

/**
 * Restore original values into an AI reply using placeholder map.
 * @param {string} reply
 * @param {Record<string, string>} map
 * @returns {{ text: string, issues: Array<{ placeholder: string, issue: string, line: number, raw?: string, severity: 'error' | 'info' }>, info: Array<{ placeholder: string, issue: string }>, comparison: Array<{ line: number, original: string, reply: string, changed: boolean }> }}
 */
export function restoreReply(reply, map) {
  const issues = [];
  const info = [];
  const knownPlaceholders = new Set(Object.keys(map));
  const seenErrors = new Set();

  const lines = reply.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];

    for (const m of line.matchAll(MERGED_PLACEHOLDER_RE)) {
      const key = `merged:${lineNum}:${m[0]}`;
      if (!seenErrors.has(key)) {
        seenErrors.add(key);
        issues.push({
          placeholder: m[0],
          issue: 'merged',
          line: lineNum,
          raw: m[0],
          severity: 'error'
        });
      }
    }

    for (const m of line.matchAll(EXACT_PLACEHOLDER_RE)) {
      const ph = m[0];
      if (!knownPlaceholders.has(ph)) {
        const key = `invented:${lineNum}:${ph}`;
        if (!seenErrors.has(key)) {
          seenErrors.add(key);
          issues.push({
            placeholder: ph,
            issue: 'invented',
            line: lineNum,
            raw: ph,
            severity: 'error'
          });
        }
      }
    }

    let scanLine = line;
    for (const ph of knownPlaceholders) {
      scanLine = scanLine.split(ph).join(' '.repeat(ph.length));
    }

    const loosePatterns = [LOOSE_BRACKET_RE, LOOSE_WORD_RE, LOOSE_COMPACT_RE];
    for (const re of loosePatterns) {
      re.lastIndex = 0;
      for (const m of scanLine.matchAll(re)) {
        const canonical = canonicalPlaceholder(m[1], m[2]);
        if (!canonical || !knownPlaceholders.has(canonical)) continue;
        if (m[0] === canonical) continue;
        const key = `changed:${lineNum}:${canonical}:${m[0]}`;
        if (!seenErrors.has(key)) {
          seenErrors.add(key);
          issues.push({
            placeholder: canonical,
            issue: 'changed',
            line: lineNum,
            raw: m[0],
            severity: 'error'
          });
        }
      }
    }
  }

  for (const placeholder of knownPlaceholders) {
    const escaped = placeholder.replace(/[[\]]/g, '\\$&');
    const used = new RegExp(escaped, 'g').test(reply);
    if (!used) {
      info.push({ placeholder, issue: 'unused' });
    }
  }

  let result = reply;
  for (const tok of tokenizePlaceholders(reply, map)) {
    result = result.slice(0, tok.start) + map[tok.value] + result.slice(tok.end);
  }

  const comparison = buildLineComparison(reply, result, map);

  return { text: result, issues, info, comparison };
}

/**
 * @param {string} reply
 * @param {Record<string, string>} map
 * @returns {Array<{ type: 'text' | 'placeholder', start: number, end: number, value: string }>}
 */
export function tokenizePlaceholders(reply, map) {
  const placeholders = Object.keys(map).sort((a, b) => b.length - a.length);
  const pattern = placeholders.map((p) => p.replace(/[[\]]/g, '\\$&')).join('|');
  if (!pattern) return [];

  const re = new RegExp(pattern, 'gi');
  const tokens = [];
  let m;
  while ((m = re.exec(reply)) !== null) {
    const canonical = placeholders.find((p) => p.toLowerCase() === m[0].toLowerCase()) || m[0];
    tokens.push({ type: 'placeholder', start: m.index, end: m.index + m[0].length, value: canonical });
  }
  return tokens.sort((a, b) => b.start - a.start);
}

/**
 * Line-by-line comparison of reply placeholders vs restored text.
 * @param {string} reply
 * @param {string} restored
 * @param {Record<string, string>} map
 * @returns {Array<{ line: number, original: string, reply: string, changed: boolean }>}
 */
export function buildLineComparison(reply, restored, map) {
  const replyLines = reply.split('\n');
  const restoredLines = restored.split('\n');
  const max = Math.max(replyLines.length, restoredLines.length);
  const rows = [];

  for (let i = 0; i < max; i++) {
    const rLine = replyLines[i] || '';
    const oLine = restoredLines[i] || '';
    let changed = rLine !== oLine;
    for (const ph of Object.keys(map)) {
      if (rLine.includes(ph) && !oLine.includes(map[ph])) changed = true;
    }
    rows.push({ line: i + 1, original: oLine, reply: rLine, changed });
  }
  return rows;
}

/**
 * Whether restoration has blocking issues requiring review.
 * @param {Array<{ severity?: string, issue: string }>} issues
 * @returns {boolean}
 */
export function hasRestoreWarnings(issues) {
  return issues.some((i) => i.severity === 'error' || (!i.severity && i.issue !== 'unused'));
}
