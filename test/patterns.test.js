import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectPatterns, resetPatternIds } from '../web/js/core/patterns.js';

describe('patterns', () => {
  it('detects email', () => {
    resetPatternIds();
    const f = detectPatterns('Contact user@example.com today.');
    assert.ok(f.some((x) => x.type === 'email'));
  });

  it('does not false-positive on non-email', () => {
    resetPatternIds();
    const f = detectPatterns('No at-sign here just text.');
    assert.equal(f.filter((x) => x.type === 'email').length, 0);
  });

  it('detects North American phone', () => {
    resetPatternIds();
    const f = detectPatterns('Call (613) 555-0198 please.');
    assert.ok(f.some((x) => x.type === 'phone'));
  });

  it('detects French street address', () => {
    resetPatternIds();
    const f = detectPatterns('Au 123, rue Saint-Denis, Montréal.');
    assert.ok(f.some((x) => x.type === 'address'));
  });

  it('detects English street address', () => {
    resetPatternIds();
    const f = detectPatterns('Lives at 45 Maple Street.');
    assert.ok(f.some((x) => x.type === 'address'));
  });

  it('detects Canadian postal code', () => {
    resetPatternIds();
    const f = detectPatterns('Code H2X 3K8 valid.');
    assert.ok(f.some((x) => x.type === 'postal_code'));
  });

  it('rejects invalid postal', () => {
    resetPatternIds();
    const f = detectPatterns('Code 12X 3K8 invalid.');
    assert.equal(f.filter((x) => x.type === 'postal_code').length, 0);
  });

  it('detects DOB near keyword EN', () => {
    resetPatternIds();
    const f = detectPatterns('Born 14 March 1991 in city.');
    assert.ok(f.some((x) => x.type === 'date_of_birth'));
  });

  it('detects DOB near keyword FR', () => {
    resetPatternIds();
    const f = detectPatterns('Née le 3 juin 1983 à Montréal.');
    assert.ok(f.some((x) => x.type === 'date_of_birth'));
  });

  it('detects age EN', () => {
    resetPatternIds();
    const f = detectPatterns('She is 17 years old.');
    assert.ok(f.some((x) => x.type === 'age'));
  });

  it('detects age FR', () => {
    resetPatternIds();
    const f = detectPatterns('Il est âgé de 42 ans.');
    assert.ok(f.some((x) => x.type === 'age'));
  });

  it('detects GPS decimal', () => {
    resetPatternIds();
    const f = detectPatterns('Point 12.6392, -8.0028 noted.');
    assert.ok(f.some((x) => x.type === 'gps'));
  });

  it('detects valid IP', () => {
    resetPatternIds();
    const f = detectPatterns('Server 192.168.1.42 logged.');
    assert.ok(f.some((x) => x.type === 'ip'));
  });

  it('detects luhn card only', () => {
    resetPatternIds();
    const f = detectPatterns('Card 4532 1234 5678 9014 used.');
    assert.ok(f.some((x) => x.type === 'payment_card'));
    const bad = detectPatterns('Card 4532 1234 5678 9012 used.');
    assert.equal(bad.filter((x) => x.type === 'payment_card').length, 0);
  });

  it('detects SIN', () => {
    resetPatternIds();
    const f = detectPatterns('SIN 046 454 286 on form.');
    assert.ok(f.some((x) => x.type === 'sin'));
  });

  it('detects IBAN', () => {
    resetPatternIds();
    const f = detectPatterns('IBAN GB82WEST12345698765432 transfer.');
    assert.ok(f.some((x) => x.type === 'iban'));
  });

  it('detects passport near keyword', () => {
    resetPatternIds();
    const f = detectPatterns('Passport AB1234567 on file.');
    assert.ok(f.some((x) => x.type === 'id_number'));
  });

  it('detects case number FR', () => {
    resetPatternIds();
    const f = detectPatterns('Numéro de dossier 2024-PROT-4420.');
    assert.ok(f.some((x) => x.type === 'id_number'));
  });

  it('detects valid IMEI EN', () => {
    resetPatternIds();
    const f = detectPatterns('Device IMEI 490154203237518 registered.');
    assert.ok(f.some((x) => x.type === 'imei'));
  });

  it('rejects invalid IMEI EN', () => {
    resetPatternIds();
    const f = detectPatterns('Device IMEI 490154203237519 registered.');
    assert.equal(f.filter((x) => x.type === 'imei').length, 0);
  });

  it('detects valid IMEI FR', () => {
    resetPatternIds();
    const f = detectPatterns('IMEI 490154203237518 sur le formulaire.');
    assert.ok(f.some((x) => x.type === 'imei'));
  });

  it('detects passport MRZ line EN', () => {
    resetPatternIds();
    const f = detectPatterns('MRZ L898902C36UTO7408122F1204159ZE184226B<<<<<10 scanned.');
    assert.ok(f.some((x) => x.type === 'passport_mrz'));
  });

  it('rejects invalid MRZ line EN', () => {
    resetPatternIds();
    const f = detectPatterns('MRZ L898902C36UTO7408122F1204159ZE184226B<<<<<11 scanned.');
    assert.equal(f.filter((x) => x.type === 'passport_mrz').length, 0);
  });

  it('detects camp address EN', () => {
    resetPatternIds();
    const f = detectPatterns('Located at Block C, Shelter 14 for distribution.');
    assert.ok(f.some((x) => x.type === 'camp_address'));
  });

  it('detects camp address FR', () => {
    resetPatternIds();
    const f = detectPatterns('Situé au Bloc C, abri 14 pour la distribution.');
    assert.ok(f.some((x) => x.type === 'camp_address'));
  });

  it('rejects non-camp block text EN', () => {
    resetPatternIds();
    const f = detectPatterns('Block party on Main Street next week.');
    assert.equal(f.filter((x) => x.type === 'camp_address').length, 0);
  });

  it('detects E.164 phone EN', () => {
    resetPatternIds();
    const f = detectPatterns('Call +14165550198 tomorrow.');
    assert.ok(f.some((x) => x.type === 'phone'));
  });

  it('detects E.164 phone FR', () => {
    resetPatternIds();
    const f = detectPatterns('Appelez le +33612345678 demain.');
    assert.ok(f.some((x) => x.type === 'phone'));
  });

  it('rejects too-short E.164', () => {
    resetPatternIds();
    const f = detectPatterns('Code +1234 only.');
    assert.equal(f.filter((x) => x.type === 'phone').length, 0);
  });
});
