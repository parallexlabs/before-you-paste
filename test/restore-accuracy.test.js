import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { restoreReply } from '../web/js/core/restore.js';

const USER_REPLY = 'Summary: [PERSON 1] met a partner from [ORG 1] at [PLACE 1]. Follow up with Person 1 by phone at [PHONE 1]. Also brief [PERSON 3] and [PLACE 1].';

const USER_MAP = {
  '[PERSON 1]': 'Amina Keller',
  '[ORG 1]': 'Northfield Relief',
  '[PLACE 1]': 'Riverside camp',
  '[PHONE 1]': '+1 604 555 0142'
};

describe('restore accuracy', () => {
  it('reports exactly two issues for the user reply', () => {
    const { issues } = restoreReply(USER_REPLY, USER_MAP);
    const errors = issues.filter((i) => i.severity === 'error');
    assert.equal(errors.length, 2);
    assert.ok(errors.some((i) => i.issue === 'changed' && /person\s*1/i.test(i.raw)));
    assert.ok(errors.some((i) => i.issue === 'invented' && i.placeholder === '[PERSON 3]'));
  });

  it('does not flag intact repeated placeholders', () => {
    const { issues } = restoreReply(USER_REPLY, USER_MAP);
    const falsePositives = issues.filter((i) =>
      (i.issue === 'changed' && i.raw === '[PERSON 1]') ||
      (i.issue === 'changed' && i.raw === '[PLACE 1]') ||
      (i.issue === 'changed' && i.raw === '[PHONE 1]') ||
      (i.issue === 'changed' && i.raw === '[ORG 1]') ||
      (i.issue === 'merged') ||
      i.issue === 'missing'
    );
    assert.equal(falsePositives.length, 0);
  });

  it('does not report placeholders absent from the mapping', () => {
    const { issues } = restoreReply(USER_REPLY, USER_MAP);
    assert.ok(!issues.some((i) => i.placeholder === '[PERSON 2]'));
  });

  it('lists unused mapping entries as information once', () => {
    const map = { ...USER_MAP, '[PERSON 2]': 'Jean Tremblay' };
    const { info } = restoreReply(USER_REPLY, map);
    assert.equal(info.filter((i) => i.placeholder === '[PERSON 2]').length, 1);
    assert.equal(info[0].issue, 'unused');
  });

  it('detects bracket case variants as changed', () => {
    const { issues } = restoreReply('Please see [Person 1] soon.', { '[PERSON 1]': 'Alice' });
    assert.ok(issues.some((i) => i.issue === 'changed'));
  });

  it('detects PERSON1 variant as changed', () => {
    const { issues } = restoreReply('Please see PERSON1 soon.', { '[PERSON 1]': 'Alice' });
    assert.ok(issues.some((i) => i.issue === 'changed'));
  });

  it('detects spaced bracket variant as changed', () => {
    const { issues } = restoreReply('Please see [PERSON 1 ] soon.', { '[PERSON 1]': 'Alice' });
    assert.ok(issues.some((i) => i.issue === 'changed'));
  });

  it('detects merged placeholders', () => {
    const { issues } = restoreReply('See [PERSON 1 and 2] together.', {
      '[PERSON 1]': 'Alice',
      '[PERSON 2]': 'Bob'
    });
    assert.ok(issues.some((i) => i.issue === 'merged'));
  });

  it('includes line number on each issue', () => {
    const { issues } = restoreReply(USER_REPLY, USER_MAP);
    for (const issue of issues.filter((i) => i.severity === 'error')) {
      assert.ok(issue.line >= 1);
    }
  });
});
