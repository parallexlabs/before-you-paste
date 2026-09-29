import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { restoreReply } from '../web/js/core/restore.js';

describe('restore nested placeholder text', () => {
  it('does not replace placeholder-like text inside original values', () => {
    const map = {
      '[EMAIL 1]': 'alias [EMAIL 2]@example.com',
      '[EMAIL 2]': 'secret'
    };
    const { text } = restoreReply('Write to [EMAIL 1] please.', map);
    assert.equal(text, 'Write to alias [EMAIL 2]@example.com please.');
  });
});
