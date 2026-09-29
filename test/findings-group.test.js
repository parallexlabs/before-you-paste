import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { groupFindingsForDisplay } from '../web/js/core/findings-group.js';

describe('findings grouping', () => {
  it('groups identical entities into one row with occurrence count', () => {
    const findings = [
      { id: '1', start: 0, end: 12, text: 'Amina Keller', type: 'person', layer: 'ner', entityKey: 'person:amina keller' },
      { id: '2', start: 17, end: 21, text: 'Jean', type: 'person', layer: 'ner', entityKey: 'person:jean' },
      { id: '3', start: 23, end: 35, text: 'Amina Keller', type: 'person', layer: 'ner', entityKey: 'person:amina keller' }
    ];
    const groups = groupFindingsForDisplay(findings);
    const amina = groups.find((g) => g.representative.text === 'Amina Keller');
    assert.ok(amina);
    assert.equal(amina.count, 2);
    assert.equal(amina.members.length, 2);
    assert.equal(groups.filter((g) => g.layer !== 'context' && g.layer !== 'mosaic').length, 2);
  });

  it('does not group mosaic or context findings', () => {
    const findings = [
      { id: 'm1', start: 0, end: 10, text: 'a + b', type: 'mosaic', layer: 'mosaic' },
      { id: 'c1', start: 0, end: 5, text: 'gbv', type: 'context', layer: 'context', category: 'gbv' }
    ];
    const groups = groupFindingsForDisplay(findings);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].count, 1);
    assert.equal(groups[1].count, 1);
  });
});
