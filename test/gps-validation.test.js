import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectPatterns, resetPatternIds, gpsDecimalValid } from '../web/js/core/patterns.js';

describe('gps validation', () => {
  it('rejects impossible decimal coordinates', () => {
    resetPatternIds();
    const f = detectPatterns('Point 999.999, -999.999 noted.');
    assert.equal(f.filter((x) => x.type === 'gps').length, 0);
  });

  it('rejects out-of-range latitude', () => {
    assert.equal(gpsDecimalValid('91.000, 10.000'), false);
  });

  it('accepts valid coordinates', () => {
    resetPatternIds();
    const f = detectPatterns('Point 12.6392, -8.0028 noted.');
    assert.ok(f.some((x) => x.type === 'gps'));
  });
});
