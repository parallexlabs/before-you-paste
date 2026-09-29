import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDigits } from '../web/js/core/normalize.js';
import { detectPatterns, resetPatternIds } from '../web/js/core/patterns.js';

describe('normalize', () => {
  it('converts Eastern Arabic digits', () => {
    assert.equal(normalizeDigits('٠١٢٣'), '0123');
  });

  it('detects phone with Eastern Arabic digits after normalization', () => {
    resetPatternIds();
    const eastern = '+١٤١٦٥٥٥٠١٩٨';
    const f = detectPatterns(`Call ${eastern} today.`);
    assert.ok(f.some((x) => x.type === 'phone'));
  });

  it('does not false-positive plain Arabic text without digits', () => {
    resetPatternIds();
    const f = detectPatterns('مرحبا بكم في الورشة');
    assert.equal(f.filter((x) => x.type === 'phone').length, 0);
  });
});
