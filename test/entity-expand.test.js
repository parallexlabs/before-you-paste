import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expandSpanToWordBoundaries } from '../web/js/core/entity-expand.js';
import { expandAndMergeEntities, nerToFindings } from '../web/js/core/detector.js';

describe('entity expansion', () => {
  it('expands truncated person span to full name', () => {
    const text = 'Amina Keller met Jean Tremblay from Northfield Relief.';
    const start = text.indexOf('Jean Tre');
    const expanded = expandSpanToWordBoundaries(text, start, start + 'Jean Tre'.length);
    assert.equal(expanded.text, 'Jean Tremblay');
  });

  it('expands truncated place span inside a longer word', () => {
    const text = 'camp near Lakeview.';
    const start = text.indexOf('Lake');
    const expanded = expandSpanToWordBoundaries(text, start, start + 'Lake'.length);
    assert.equal(expanded.text, 'Lakeview');
  });

  it('keeps hyphenated names intact', () => {
    const text = 'Contact Al-Hassan today.';
    const start = text.indexOf('Al-Hassan');
    const expanded = expandSpanToWordBoundaries(text, start, start + 'Al-Hassan'.length);
    assert.equal(expanded.text, 'Al-Hassan');
  });

  it('keeps apostrophe names intact', () => {
    const text = "Sean O'Connor arrived.";
    const start = text.indexOf("O'Connor");
    const expanded = expandSpanToWordBoundaries(text, start, start + "O'Connor".length);
    assert.equal(expanded.text, "O'Connor");
  });

  it('keeps multi-segment place names intact', () => {
    const text = 'Based in Saint-Jean-sur-Richelieu.';
    const start = text.indexOf('Saint-Jean-sur-Richelieu');
    const expanded = expandSpanToWordBoundaries(text, start, start + 'Saint-Jean-sur-Richelieu'.length);
    assert.equal(expanded.text, 'Saint-Jean-sur-Richelieu');
  });

  it('merges adjacent same-type expanded entities', () => {
    const text = 'Nguyễn Thị Minh Khai spoke.';
    const entities = expandAndMergeEntities(text, [
      { entity: 'B-PER', word: 'Nguyễn', start: 0, end: 6, score: 0.9 },
      { entity: 'I-PER', word: 'Thị', start: 7, end: 10, score: 0.9 },
      { entity: 'I-PER', word: 'Minh', start: 11, end: 15, score: 0.9 },
      { entity: 'I-PER', word: 'Khai', start: 16, end: 20, score: 0.9 }
    ]);
    assert.equal(entities.length, 1);
    assert.equal(entities[0].text, 'Nguyễn Thị Minh Khai');
  });

  it('nerToFindings expands truncated model output to whole words', () => {
    const text = 'Jean Tremblay visited Lakeview.';
    const findings = nerToFindings(text, [
      { entity: 'B-PER', word: 'Jean', start: 0, end: 4, score: 0.95 },
      { entity: 'I-PER', word: 'Tre', start: 5, end: 8, score: 0.94 },
      { entity: 'B-LOC', word: 'Lake', start: 22, end: 26, score: 0.93 }
    ]);
    const person = findings.find((f) => f.type === 'person');
    const place = findings.find((f) => f.type === 'place');
    assert.equal(person?.text, 'Jean Tremblay');
    assert.equal(place?.text, 'Lakeview');
  });

  it('handles Oluwaseun Adeyemi as one person', () => {
    const text = 'Oluwaseun Adeyemi called.';
    const findings = nerToFindings(text, [
      { entity: 'B-PER', word: 'Oluwaseun', start: 0, end: 9, score: 0.95 },
      { entity: 'I-PER', word: 'Ade', start: 10, end: 13, score: 0.94 }
    ]);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].text, 'Oluwaseun Adeyemi');
  });
});
