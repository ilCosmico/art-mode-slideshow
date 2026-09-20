const test = require('node:test');
const assert = require('node:assert/strict');
const { MOVEMENTS, MOVEMENT_KEYS, styleValues, sourceSupportsMovements } = require('./movements');

test('a selected movement maps to the exact value AIC stores', () => {
  assert.deepEqual(styleValues(['impressionism']), ['Impressionism']);
  assert.deepEqual(styleValues(['postImpressionism']), ['Post-Impressionism']);
});

test('values keep AIC exact spelling and case, including lowercase entries', () => {
  assert.deepEqual(styleValues(['romanticism', 'nabis', 'northernRenaissance']), ['romantic', 'nabis', 'northern renaissance']);
});

test('several movements merge into one list, in selection order, without duplicates', () => {
  assert.deepEqual(styleValues(['baroque', 'realism', 'baroque']), ['Baroque', 'Realism']);
});

test('no selection and unknown keys produce no values', () => {
  assert.deepEqual(styleValues([]), []);
  assert.deepEqual(styleValues(['no-such-movement']), []);
});

test('Impressionism and Post-Impressionism stay distinct entries, and so do Renaissance and Northern Renaissance', () => {
  assert.notEqual(MOVEMENTS.impressionism, MOVEMENTS.postImpressionism);
  assert.notEqual(MOVEMENTS.renaissance, MOVEMENTS.northernRenaissance);
});

test('no two movements share the same AIC value', () => {
  const values = MOVEMENT_KEYS.map((key) => MOVEMENTS[key]);
  assert.equal(new Set(values).size, values.length);
});

test('every value is a non-empty string without stray whitespace', () => {
  for (const key of MOVEMENT_KEYS) {
    const value = MOVEMENTS[key];
    assert.ok(typeof value === 'string' && value.length > 0 && value === value.trim(), key);
  }
});

test('without a selection every source qualifies', () => {
  assert.equal(sourceSupportsMovements('aic', []), true);
  assert.equal(sourceSupportsMovements('met', []), true);
});

test('with a selection only AIC qualifies, so the Met is skipped', () => {
  assert.equal(sourceSupportsMovements('aic', ['impressionism']), true);
  assert.equal(sourceSupportsMovements('met', ['impressionism']), false);
});
