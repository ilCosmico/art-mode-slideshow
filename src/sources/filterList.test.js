const test = require('node:test');
const assert = require('node:assert/strict');
const { pickRandom } = require('./filterList');

test('empty or undefined input returns empty string', () => {
  assert.equal(pickRandom(''), '');
  assert.equal(pickRandom(undefined), '');
});

test('a single value with no ";" is returned as-is', () => {
  assert.equal(pickRandom('Monet'), 'Monet');
});

test('surrounding whitespace on a single value is trimmed', () => {
  assert.equal(pickRandom('  Monet  '), 'Monet');
});

test('a trailing ";" or only ";" characters do not produce empty picks', () => {
  assert.equal(pickRandom('Monet;'), 'Monet');
  assert.equal(pickRandom(';;;'), '');
});

test('picks only ever come from the ";"-separated list, with each value trimmed', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    seen.add(pickRandom('Monet; Rembrandt ;Vermeer'));
  }
  assert.deepEqual(seen, new Set(['Monet', 'Rembrandt', 'Vermeer']));
});
