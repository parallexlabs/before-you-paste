import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectAll } from '../web/js/core/detector.js';
import { detectMosaicWarnings, resetMosaicIds } from '../web/js/core/mosaic.js';
import { FINDING_TYPES } from '../web/js/core/types.js';

describe('mosaic pairings', () => {
  it('flags age and location pairing EN', () => {
    const text = 'Male beneficiary age 22 at Block C, Shelter 14 in village Northvale.';
    const f = detectAll(text);
    assert.ok(f.some((x) => x.layer === 'mosaic' && x.explanationKey === 'mosaic.pair.ageLocation'));
    assert.ok(f.some((x) => x.layer === 'mosaic' && x.explanationKey === 'mosaic.pair.ageSex'));
  });

  it('flags group match FR', () => {
    const text = 'Hommes âgés de 18-25 au Bloc C, abri 14 signalés pour distribution.';
    const f = detectAll(text);
    assert.ok(f.some((x) => x.layer === 'mosaic' && x.groupRisk));
  });

  it('names exact combined items', () => {
    resetMosaicIds();
    const text = 'Teacher in village Koro, age 37, located at Block C, Shelter 14.';
    const findings = [
      { id: 'a1', start: 28, end: 34, text: 'age 37', type: FINDING_TYPES.AGE, layer: 'pattern' },
      { id: 'c1', start: 47, end: 66, text: 'Block C, Shelter 14', type: FINDING_TYPES.CAMP_ADDRESS, layer: 'pattern' }
    ];
    const warnings = detectMosaicWarnings(text, findings);
    const ageLoc = warnings.find((w) => w.explanationKey === 'mosaic.pair.ageLocation');
    assert.ok(ageLoc);
    assert.ok(ageLoc.mosaicItems.includes('age 37'));
    assert.ok(ageLoc.mosaicItems.some((item) => item.includes('Block C')));
    assert.equal(ageLoc.text, ageLoc.mosaicItems.join(' + '));
  });
});
