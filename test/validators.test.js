import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { luhnCheck, ibanValid, sinValid, cardValid, ipValid, imeiValid, mrzLine2Valid, e164Valid } from '../web/js/core/validators.js';

describe('validators', () => {
  it('luhn accepts valid card', () => {
    assert.equal(luhnCheck('4532123456789014'), true);
    assert.equal(luhnCheck('4111111111111111'), true);
  });

  it('luhn rejects invalid card', () => {
    assert.equal(luhnCheck('4532123456789012'), false);
  });

  it('sin valid for test numbers', () => {
    assert.equal(sinValid('046 454 286'), true);
    assert.equal(sinValid('130 692 544'), true);
    assert.equal(sinValid('123 456 789'), false);
  });

  it('iban valid', () => {
    assert.equal(ibanValid('GB82WEST12345698765432'), true);
    assert.equal(ibanValid('FR1420041010050500013M02606'), true);
    assert.equal(ibanValid('XX00INVALID'), false);
  });

  it('card valid length and luhn', () => {
    assert.equal(cardValid('4532 1234 5678 9014'), true);
    assert.equal(cardValid('1234'), false);
  });

  it('ip valid', () => {
    assert.equal(ipValid('192.168.1.1'), true);
    assert.equal(ipValid('999.999.999.999'), false);
  });

  it('imei valid', () => {
    assert.equal(imeiValid('490154203237518'), true);
    assert.equal(imeiValid('490154203237519'), false);
  });

  it('mrz line 2 valid', () => {
    assert.equal(mrzLine2Valid('L898902C36UTO7408122F1204159ZE184226B<<<<<10'), true);
    assert.equal(mrzLine2Valid('L898902C36UTO7408122F1204159ZE184226B<<<<<11'), false);
  });

  it('accepts filler check digit only when personal number is all filler', () => {
    assert.equal(mrzLine2Valid('L898902C36UTO7408122F1204159<<<<<<<<<<<<<<<8'), true);
    const dataWithFillerCheck = 'L898902C36UTO7408122F1204159ZE184226B<<<<<<<9';
    assert.equal(mrzLine2Valid(dataWithFillerCheck), false);
  });

  it('e164 valid', () => {
    assert.equal(e164Valid('+14165550198'), true);
    assert.equal(e164Valid('+1234'), false);
  });
});
