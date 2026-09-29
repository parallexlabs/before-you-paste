import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectAll } from '../web/js/core/detector.js';
import { detectContextFlags } from '../web/js/core/context-flags.js';

describe('detector', () => {
  it('returns empty for blank text', () => {
    assert.deepEqual(detectAll(''), []);
    assert.deepEqual(detectAll('   '), []);
  });

  it('includes context flags', () => {
    const f = detectAll('Report of domestic violence incident.');
    assert.ok(f.some((x) => x.layer === 'context' && x.category === 'gbv'));
  });

  it('includes mosaic warning when combined signals', () => {
    const text = 'Teacher in village Koro, age 34, born 14 March 1991, diabetes noted.';
    const f = detectAll(text);
    assert.ok(f.some((x) => x.layer === 'mosaic'));
  });

  it('context flags FR', () => {
    const f = detectContextFlags('violence conjugale signalée');
    assert.ok(f.some((x) => x.category === 'gbv'));
  });
});
