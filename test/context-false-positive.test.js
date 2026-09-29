import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectContextFlags } from '../web/js/core/context-flags.js';

describe('context false positives', () => {
  it('does not flag gai inside again', () => {
    const f = detectContextFlags('She will visit again on Friday.');
    assert.equal(f.filter((x) => x.category === 'sogi').length, 0);
  });

  it('does not flag minor inside minority', () => {
    const f = detectContextFlags('A minority group was discussed.');
    assert.equal(f.filter((x) => x.category === 'children').length, 0);
  });

  it('does not flag placement inside unrelated English words', () => {
    const f = detectContextFlags('Replacement parts arrived.');
    assert.equal(f.length, 0);
  });

  it('still flags real French gai term', () => {
    const f = detectContextFlags('Il s\'identifie comme gai.');
    assert.ok(f.some((x) => x.category === 'sogi' && x.text.toLowerCase() === 'gai'));
  });
});
