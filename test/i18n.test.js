import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'i18n');
const en = JSON.parse(readFileSync(join(root, 'en.json'), 'utf8'));
const fr = JSON.parse(readFileSync(join(root, 'fr.json'), 'utf8'));

describe('i18n', () => {
  it('en and fr have identical keys', () => {
    const enKeys = Object.keys(en).sort();
    const frKeys = Object.keys(fr).sort();
    assert.deepEqual(enKeys, frKeys);
  });

  it('no empty values', () => {
    for (const [k, v] of Object.entries(en)) {
      assert.ok(v.trim().length > 0, `empty en key: ${k}`);
    }
    for (const [k, v] of Object.entries(fr)) {
      assert.ok(v.trim().length > 0, `empty fr key: ${k}`);
    }
  });

  it('restore wording distinguishes flagged issues from unused placeholders', () => {
    assert.match(en['restore.instructions'], /changed, merged or invented are flagged/i);
    assert.doesNotMatch(en['restore.instructions'], /dropped are flagged/i);
    assert.match(en['restore.instructions'], /does not use are listed/i);
    assert.match(en['restore.reviewInstructions'], /does not use are listed/i);
    assert.match(fr['restore.instructions'], /modifiés, fusionnés ou inventés sont signalés/i);
    assert.match(fr['restore.instructions'], /n'utilise pas sont listés/i);
  });
});
