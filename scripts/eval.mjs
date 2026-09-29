#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectAll, nerToFindings } from '../web/js/core/detector.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const withModel = process.argv.includes('--with-model');
const practice = JSON.parse(readFileSync(join(root, 'web/data/practice.json'), 'utf8'));

const MODEL_ID = 'Xenova/distilbert-base-multilingual-cased-ner-hrl';
const MODEL_REVISION = 'c2a4dbf593c57f47004c5bc2d3770d311aee9c43';

/**
 * @param {string} text
 * @returns {string}
 */
function normText(text) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * @param {import('../web/js/core/types.js').Finding} finding
 * @param {{ text: string, type: string }} key
 */
function findingMatchesKey(finding, key) {
  if (finding.type !== key.type) return false;
  const ft = normText(finding.text);
  const kt = normText(key.text);
  return ft === kt;
}

/**
 * @param {import('../web/js/core/types.js').Finding[]} findings
 * @param {{ text: string, type: string }} key
 */
function findExactMatch(findings, key) {
  return findings.find((f) => findingMatchesKey(f, key));
}

let nerPipeline = null;

async function loadNer() {
  if (nerPipeline) return nerPipeline;
  const { pipeline } = await import('@huggingface/transformers');
  nerPipeline = await pipeline('token-classification', MODEL_ID, {
    quantized: true,
    revision: MODEL_REVISION
  });
  return nerPipeline;
}

/**
 * @param {string} text
 */
async function detectForEval(text) {
  if (!withModel) return detectAll(text);
  const pipe = await loadNer();
  const output = await pipe(text, { aggregation_strategy: 'none' });
  const nerFindings = nerToFindings(text, output.map((o) => ({
    entity: o.entity_group || o.entity,
    word: o.word,
    start: o.start,
    end: o.end,
    score: o.score
  })));
  return detectAll(text, { includeNer: true, nerFindings });
}

async function main() {
  const byCategory = {};
  let totalTp = 0;
  let totalFn = 0;
  let totalFp = 0;
  const allKeys = [];
  const nearMisses = [];
  const repeatedEntityCases = [];
  /** @type {Array<{ passageId: string, text: string, type: string, expected: number, detected: number }>} */
  const repeatedEntityResults = [];

  for (const passage of practice.passages) {
    if (passage.wrongUse) continue;
    const findings = await detectForEval(passage.text);

    const keyOccurrences = new Map();
    for (const key of passage.answerKey) {
      const nk = `${normText(key.text)}:${key.type}`;
      keyOccurrences.set(nk, (keyOccurrences.get(nk) || 0) + 1);
    }
    for (const [nk, count] of keyOccurrences) {
      if (count > 1) {
        repeatedEntityCases.push({ passageId: passage.id, key: nk, count });
        const [text, type] = nk.split(/:(?=[^:]+$)/);
        let detected = 0;
        for (const f of findings) {
          if (f.type !== type) continue;
          if (normText(f.text) === text) detected += 1;
        }
        repeatedEntityResults.push({
          passageId: passage.id,
          text,
          type,
          expected: count,
          detected: Math.min(detected, count)
        });
      }
    }

    for (const key of passage.answerKey) {
      allKeys.push({ ...key, passageId: passage.id });
      const cat = key.type;
      if (!byCategory[cat]) byCategory[cat] = { tp: 0, fn: 0, fp: 0, n: 0, uniqueKeys: new Set() };
      byCategory[cat].uniqueKeys.add(`${passage.id}:${key.text}:${key.type}`);
      byCategory[cat].n += 1;

      const match = findExactMatch(findings, key);
      if (match) {
        byCategory[cat].tp += 1;
        totalTp += 1;
      } else {
        byCategory[cat].fn += 1;
        totalFn += 1;
        const near = findings.find((f) => f.type === key.type && (
          normText(f.text).includes(normText(key.text)) || normText(key.text).includes(normText(f.text))
        ));
        if (near) {
          nearMisses.push({
            passageId: passage.id,
            expected: key.text,
            got: near.text,
            type: key.type
          });
        }
      }
    }

    for (const f of findings) {
      if (f.layer === 'mosaic') continue;
      const cat = f.type;
      const matchedKey = passage.answerKey.some((k) => findingMatchesKey(f, k));
      if (!matchedKey) {
        if (!byCategory[cat]) byCategory[cat] = { tp: 0, fn: 0, fp: 0, n: 0, uniqueKeys: new Set() };
        byCategory[cat].fp += 1;
        totalFp += 1;
      }
    }
  }

  const contextFpSamples = [];
  for (const term of ['again', 'minority', 'gayest']) {
    const flags = detectAll(`The word ${term} appears here.`).filter((f) => f.layer === 'context');
    if (flags.length) contextFpSamples.push({ term, matched: flags.map((f) => f.text) });
  }

  const results = {
    mode: withModel ? 'pattern-and-model' : 'pattern-only',
    date: new Date().toISOString().slice(0, 10),
    model: withModel ? MODEL_ID : null,
    modelRevision: withModel ? MODEL_REVISION : null,
    transformersJsVersion: withModel ? '4.3.0' : null,
    passages: practice.passages.filter((p) => !p.wrongUse).length,
    totalAnswerKeyItems: allKeys.length,
    uniqueAnswerKeyItems: new Set(allKeys.map((k) => `${k.passageId}:${normText(k.text)}:${k.type}`)).size,
    repeatedEntityCases,
    repeatedEntityResults,
    nearMisses,
    contextFalsePositiveSamples: contextFpSamples,
    totals: {
      tp: totalTp,
      fn: totalFn,
      fp: totalFp,
      recall: totalTp + totalFn > 0 ? (totalTp / (totalTp + totalFn)).toFixed(3) : '0',
      precision: totalTp + totalFp > 0 ? (totalTp / (totalTp + totalFp)).toFixed(3) : '0'
    },
    byCategory: {}
  };

  for (const [cat, s] of Object.entries(byCategory)) {
    results.byCategory[cat] = {
      n: s.n,
      uniqueItems: s.uniqueKeys.size,
      tp: s.tp,
      fn: s.fn,
      fp: s.fp,
      recall: s.n > 0 ? (s.tp / s.n).toFixed(3) : '0',
      precision: s.tp + s.fp > 0 ? (s.tp / (s.tp + s.fp)).toFixed(3) : '0'
    };
  }

  mkdirSync(join(root, 'eval'), { recursive: true });
  const outFile = withModel ? 'results-model.json' : 'results.json';
  writeFileSync(join(root, 'eval', outFile), JSON.stringify(results, null, 2));
  if (!withModel) {
    writeFileSync(join(root, 'web/data/eval-recall.json'), JSON.stringify(results, null, 2));
  }

  let md = `# Evaluation results (${results.mode})\n\n`;
  md += `Date: ${results.date}\n\n`;
  if (withModel) {
    md += `Model: ${MODEL_ID} @ ${MODEL_REVISION}\n\n`;
  }
  md += `Passages: ${results.passages} | Answer key items: ${results.totalAnswerKeyItems} (unique: ${results.uniqueAnswerKeyItems})\n\n`;
  md += `| Category | n (unique) | TP | FN | FP | Recall | Precision |\n`;
  md += `|----------|------------|----|----|-----|--------|----------|\n`;
  for (const [cat, s] of Object.entries(results.byCategory)) {
    md += `| ${cat} | ${s.n} (${s.uniqueItems}) | ${s.tp} | ${s.fn} | ${s.fp} | ${s.recall} | ${s.precision} |\n`;
  }
  md += `\n**Overall recall:** ${results.totals.tp}/${results.totals.tp + results.totals.fn} = ${results.totals.recall}\n`;
  md += `**Overall precision:** ${results.totals.tp}/${results.totals.tp + results.totals.fp} = ${results.totals.precision}\n`;
  if (results.repeatedEntityResults?.length) {
    md += `\n**Repeated-entity detection:**\n\n`;
    md += `| Passage | Text | Type | Expected | Detected |\n`;
    md += `|---------|------|------|----------|----------|\n`;
    for (const row of results.repeatedEntityResults) {
      md += `| ${row.passageId} | ${row.text} | ${row.type} | ${row.expected} | ${row.detected} |\n`;
    }
  }
  if (nearMisses.length) {
    md += `\n**Near misses:** ${nearMisses.length}\n`;
  }
  if (contextFpSamples.length) {
    md += `\n**Context false-positive samples:** ${JSON.stringify(contextFpSamples)}\n`;
  }

  writeFileSync(join(root, 'eval', withModel ? 'results-model.md' : 'results.md'), md);
  console.log(md);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
