import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findWholePhraseMatches, replaceAllPhrases } from '../web/js/core/word-boundary.js';

describe('word-boundary', () => {
  it('does not match gai inside again', () => {
    const matches = findWholePhraseMatches('She will visit again on Friday.', 'gai');
    assert.equal(matches.length, 0);
  });

  it('does not match minor inside minority', () => {
    const matches = findWholePhraseMatches('A minority group was mentioned.', 'minor');
    assert.equal(matches.length, 0);
  });

  it('does not match gay inside gayest', () => {
    const matches = findWholePhraseMatches('That was the gayest parade.', 'gay');
    assert.equal(matches.length, 0);
  });

  it('matches standalone phrases case-insensitively', () => {
    const matches = findWholePhraseMatches('Report of DOMESTIC VIOLENCE incident.', 'domestic violence');
    assert.equal(matches.length, 1);
  });

  it('replaces all phrase occurrences', () => {
    const { text, count } = replaceAllPhrases('Amina Keller met Jean. Amina Keller leaves.', 'Amina Keller', '[PERSON 1]');
    assert.equal(count, 2);
    assert.ok(!text.includes('Amina Keller'));
  });
});
