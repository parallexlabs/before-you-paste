import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectPatterns, resetPatternIds } from '../web/js/core/patterns.js';

describe('international phone', () => {
  it('includes country code and separators for +1 numbers', () => {
    resetPatternIds();
    const text = 'Call +1 604 555 0142 tomorrow.';
    const f = detectPatterns(text);
    const phone = f.find((x) => x.type === 'phone');
    assert.ok(phone);
    assert.equal(phone.text, '+1 604 555 0142');
    assert.ok(phone.text.startsWith('+1'));
  });
});
