import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkInputLength, MAX_INPUT_CHARS } from '../web/js/core/input-limit.js';

describe('input limit', () => {
  it('allows text within limit', () => {
    const r = checkInputLength('a'.repeat(MAX_INPUT_CHARS));
    assert.equal(r.ok, true);
  });

  it('rejects text over limit', () => {
    const r = checkInputLength('a'.repeat(MAX_INPUT_CHARS + 1));
    assert.equal(r.ok, false);
    assert.equal(r.length, MAX_INPUT_CHARS + 1);
  });
});
