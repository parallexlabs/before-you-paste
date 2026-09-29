import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generalizeAge, generalizeDate, generalizePlace, generalizeFinding, canGeneralize } from '../web/js/core/generalize.js';

describe('generalize', () => {
  it('age bands in English and French', () => {
    assert.equal(generalizeAge('17 years old'), 'under 18');
    assert.equal(generalizeAge('age 34'), '30-44');
    assert.equal(generalizeAge('17 ans', 'fr'), 'moins de 18 ans');
    assert.equal(generalizeAge('42 ans', 'fr'), '30-44 ans');
  });

  it('date to month and year with day-first and month-first formats', () => {
    assert.equal(generalizeDate('14 March 1991'), 'March 1991');
    assert.equal(generalizeDate('31/12/2020'), 'December 2020');
    assert.equal(generalizeDate('12/31/2020'), 'December 2020');
    assert.equal(generalizeDate('3 juin 1983', 'fr'), 'juin 1983');
    assert.equal(generalizeDate('31/12/2020', 'fr'), 'décembre 2020');
  });

  it('uses year only for ambiguous numeric dates', () => {
    assert.equal(generalizeDate('01/02/2020'), '2020');
    assert.equal(generalizeDate('01/02/2020', 'fr'), '2020');
  });

  it('never emits an invalid month number', () => {
    const g = generalizeDate('31/12/2020');
    assert.doesNotMatch(g, /month 31/i);
    assert.equal(g, 'December 2020');
  });

  it('generalizes places to neutral categories without the original name', () => {
    assert.equal(generalizePlace('village Koro-Segou'), 'a town in the area');
    assert.equal(generalizePlace('district near Paris'), 'a town in the area');
    assert.equal(generalizePlace('hameau de Lac-Bleu', 'fr'), 'une localité de la région');
    assert.doesNotMatch(generalizePlace('Paris'), /Paris/i);
  });

  it('only allows generalization for supported types', () => {
    assert.equal(canGeneralize('age'), true);
    assert.equal(canGeneralize('payment_card'), false);
    assert.throws(() => generalizeFinding({ type: 'payment_card', text: '4532 1234 5678 9014' }));
    assert.throws(() => generalizeFinding({ type: 'gps', text: '12.6, -8.0' }));
  });
});
