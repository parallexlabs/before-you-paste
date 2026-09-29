import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { restoreReply } from '../web/js/core/restore.js';

describe('restore', () => {
  it('restores placeholders', () => {
    const { text } = restoreReply('Hello [EMAIL 1] thanks.', { '[EMAIL 1]': 'user@example.com' });
    assert.equal(text, 'Hello user@example.com thanks.');
  });

  it('lists unused placeholder as information', () => {
    const { info } = restoreReply('No placeholders here.', { '[EMAIL 1]': 'user@example.com' });
    assert.ok(info.some((i) => i.issue === 'unused'));
  });

  it('flags invented placeholder', () => {
    const { issues } = restoreReply('Hello [PERSON 3] there.', { '[PERSON 1]': 'Alice' });
    assert.ok(issues.some((i) => i.issue === 'invented'));
  });

  it('flags changed placeholder without brackets', () => {
    const { issues } = restoreReply('Hello Person 1 thanks.', { '[PERSON 1]': 'Alice' });
    assert.ok(issues.some((i) => i.issue === 'changed'));
  });

  it('builds line comparison', () => {
    const { comparison } = restoreReply('Line one\nLine two', { '[EMAIL 1]': 'a@b.c' });
    assert.equal(comparison.length, 2);
  });
});
