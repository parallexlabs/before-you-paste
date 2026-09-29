import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeBioEntities, nerToFindings } from '../web/js/core/detector.js';

describe('ner entity merging', () => {
  it('merges B-/I- ORG tokens into one organization span', () => {
    const text = 'Northfield Relief distributed supplies.';
    const tokens = [
      { entity: 'B-ORG', word: 'Northfield', start: 0, end: 10, score: 0.99 },
      { entity: 'I-ORG', word: 'Relief', start: 11, end: 17, score: 0.98 }
    ];
    const merged = mergeBioEntities(text, tokens);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].text, 'Northfield Relief');
  });

  it('merges French multi-word place tokens', () => {
    const text = 'Visite à Montréal Nord hier.';
    const tokens = [
      { entity: 'B-LOC', word: 'Montréal', start: 9, end: 17, score: 0.95 },
      { entity: 'I-LOC', word: 'Nord', start: 18, end: 22, score: 0.94 }
    ];
    const merged = mergeBioEntities(text, tokens);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].text, 'Montréal Nord');
  });

  it('produces findings with exact offsets', () => {
    const text = 'Northfield Relief helped.';
    const findings = nerToFindings(text, [
      { entity: 'B-ORG', word: 'Northfield', start: 0, end: 10, score: 0.99 },
      { entity: 'I-ORG', word: 'Relief', start: 11, end: 17, score: 0.98 }
    ]);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].type, 'organization');
    assert.equal(text.slice(findings[0].start, findings[0].end), 'Northfield Relief');
  });
});
