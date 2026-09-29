import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPreparedText, assignPlaceholder } from '../web/js/core/placeholders.js';

describe('placeholders', () => {
  it('uses consistent placeholders for same entity', () => {
    const map = new Map();
    const counters = {};
    const f1 = { type: 'email', text: 'a@b.com' };
    const f2 = { type: 'email', text: 'a@b.com' };
    const p1 = assignPlaceholder(f1, map, counters);
    const p2 = assignPlaceholder(f2, map, counters);
    assert.equal(p1, p2);
  });

  it('builds prepared text with replacements', () => {
    const text = 'Email user@example.com please.';
    const findings = [{
      id: '1', start: 6, end: 22, text: 'user@example.com', type: 'email', layer: 'pattern', action: 'replace'
    }];
    const { text: out, map, counts } = buildPreparedText(text, findings);
    assert.ok(out.includes('[EMAIL 1]'));
    assert.equal(map['[EMAIL 1]'], 'user@example.com');
    assert.equal(counts.replaced, 1);
  });

  it('replaces every occurrence of the same person name', () => {
    const text = 'Amina Keller met Jean Tremblay. Amina Keller will visit again on Friday.';
    const findings = [{
      id: '1', start: 0, end: 12, text: 'Amina Keller', type: 'person', layer: 'ner', action: 'replace', entityKey: 'person:amina keller'
    }];
    const { text: out, counts } = buildPreparedText(text, findings);
    assert.equal((out.match(/\[PERSON 1\]/g) || []).length, 2);
    assert.ok(!out.includes('Amina Keller'));
    assert.equal(counts.replaced, 2);
  });

  it('defaults pending pattern findings to replace on prepare', () => {
    const text = 'Call user@example.com or user@example.com again.';
    const findings = [{
      id: '1', start: 5, end: 21, text: 'user@example.com', type: 'email', layer: 'pattern', action: 'pending'
    }];
    const { text: out, counts } = buildPreparedText(text, findings);
    assert.equal((out.match(/\[EMAIL 1\]/g) || []).length, 2);
    assert.equal(counts.replaced, 2);
  });

  it('numbers placeholders by first appearance in text', () => {
    const text = 'Jean Tremblay met Amina Keller.';
    const findings = [
      { id: '2', start: 19, end: 31, text: 'Amina Keller', type: 'person', layer: 'ner', action: 'replace' },
      { id: '1', start: 0, end: 12, text: 'Jean Tremblay', type: 'person', layer: 'ner', action: 'replace' }
    ];
    const { text: out } = buildPreparedText(text, findings);
    assert.ok(out.startsWith('[PERSON 1] met [PERSON 2]'));
  });
});

