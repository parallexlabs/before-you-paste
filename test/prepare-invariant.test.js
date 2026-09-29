import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPreparedText, validatePreparedText } from '../web/js/core/placeholders.js';

describe('prepare invariant', () => {
  it('passes when all replace phrases are removed', () => {
    const text = 'Jean Tremblay met Amina Keller.';
    const findings = [
      { id: '1', start: 0, end: 12, text: 'Jean Tremblay', type: 'person', layer: 'ner', action: 'replace' },
      { id: '2', start: 17, end: 29, text: 'Amina Keller', type: 'person', layer: 'ner', action: 'replace' }
    ];
    const { text: prepared } = buildPreparedText(text, findings);
    const violations = validatePreparedText(prepared, findings);
    assert.equal(violations.length, 0);
  });

  it('fails when a replace phrase still appears in prepared text', () => {
    const text = 'Jean Tremblay visited Lakeview.';
    const findings = [
      { id: '1', start: 0, end: 12, text: 'Jean Tremblay', type: 'person', layer: 'ner', action: 'replace' },
      { id: '2', start: 18, end: 26, text: 'Lakeview', type: 'place', layer: 'ner', action: 'replace' }
    ];
    const violations = validatePreparedText(text, findings);
    assert.equal(violations.length, 2);
    assert.ok(violations.some((v) => v.text === 'Jean Tremblay'));
    assert.ok(violations.some((v) => v.text === 'Lakeview'));
  });

  it('map only contains placeholders present in prepared text', () => {
    const text = 'Jean Tremblay only.';
    const findings = [
      { id: '1', start: 0, end: 12, text: 'Jean Tremblay', type: 'person', layer: 'ner', action: 'replace' },
      { id: '2', start: 0, end: 4, text: 'Jean', type: 'person', layer: 'ner', action: 'replace', entityKey: 'person:jean tremblay' }
    ];
    const { text: prepared, map } = buildPreparedText(text, findings);
    assert.ok(prepared.includes('[PERSON 1]'));
    assert.equal(Object.keys(map).length, 1);
    assert.ok(map['[PERSON 1]']);
  });
});
