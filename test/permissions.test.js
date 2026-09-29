import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePermissions } from '../web/js/core/permissions.js';

describe('permissions', () => {
  it('allows scan when not personal data', () => {
    const r = evaluatePermissions({ personalData: 'no', toolApproved: 'unknown', purposeAllowed: 'unknown' });
    assert.equal(r.allowed, true);
  });

  it('allows scan when personal data with approved tool and purpose', () => {
    const r = evaluatePermissions({ personalData: 'yes', toolApproved: 'yes', purposeAllowed: 'yes' });
    assert.equal(r.allowed, true);
  });

  it('blocks when personal data and tool not approved', () => {
    const r = evaluatePermissions({ personalData: 'yes', toolApproved: 'no', purposeAllowed: 'yes' });
    assert.equal(r.allowed, false);
    assert.equal(r.reasonKey, 'permission.blocked');
  });

  it('blocks when personal data and purpose unknown', () => {
    const r = evaluatePermissions({ personalData: 'yes', toolApproved: 'yes', purposeAllowed: 'unknown' });
    assert.equal(r.allowed, false);
  });

  it('treats personal data not sure like yes when tool and purpose approved', () => {
    const r = evaluatePermissions({ personalData: 'unknown', toolApproved: 'yes', purposeAllowed: 'yes' });
    assert.equal(r.allowed, true);
  });

  it('blocks when personal data not sure but purpose unknown', () => {
    const r = evaluatePermissions({ personalData: 'unknown', toolApproved: 'yes', purposeAllowed: 'unknown' });
    assert.equal(r.allowed, false);
  });
});

