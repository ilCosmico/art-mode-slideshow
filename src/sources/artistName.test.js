const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeArtist } = require('./artistName');

test('empty, null, or undefined input returns empty string', () => {
  assert.equal(normalizeArtist(''), '');
  assert.equal(normalizeArtist(null), '');
  assert.equal(normalizeArtist(undefined), '');
});

test('known unknown-artist phrases, verified live from AIC and Met, resolve to empty', () => {
  // AIC
  assert.equal(normalizeArtist('Artist Unknown\nChinese'), '');
  assert.equal(normalizeArtist('Artist unknown (American, 18th century)'), '');
  assert.equal(normalizeArtist('Unidentified artist\nJapanese, active 19th century'), '');
  assert.equal(normalizeArtist('Anonymous\nJapanese'), '');
  // Met
  assert.equal(normalizeArtist('Unidentified artist'), '');
  assert.equal(normalizeArtist('Unknown'), '');
  assert.equal(normalizeArtist('Unknown Artist'), '');
  assert.equal(normalizeArtist('Anonymous, Czech, early 20th century'), '');
});

test('matching is case-insensitive', () => {
  assert.equal(normalizeArtist('UNKNOWN'), '');
  assert.equal(normalizeArtist('anonymous'), '');
});

test('known real artist names pass through unchanged', () => {
  assert.equal(normalizeArtist('Claude Monet (French, 1840-1926)'), 'Claude Monet (French, 1840-1926)');
  assert.equal(normalizeArtist('Rembrandt (Rembrandt van Rijn)'), 'Rembrandt (Rembrandt van Rijn)');
});

test('a real artist whose chosen credit contains "Anonymous" is not stripped', () => {
  // Real AIC catalog entry: Bruce Conner titled a work "Anonymous" - the
  // artist is identified, just not by a straightforward name.
  assert.equal(normalizeArtist('"Anonymous" (Bruce Conner)'), '"Anonymous" (Bruce Conner)');
  assert.equal(normalizeArtist('Anonymous Fermilab Photographer'), 'Anonymous Fermilab Photographer');
});
