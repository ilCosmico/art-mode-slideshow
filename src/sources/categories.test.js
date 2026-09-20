const test = require('node:test');
const assert = require('node:assert/strict');
const { CATEGORIES, CATEGORY_KEYS, termsForSource, sourceSupports } = require('./categories');

test('a single category returns exactly its terms for that source', () => {
  assert.deepEqual(termsForSource('aic', ['landscape']), ['landscapes', 'landscape']);
  assert.deepEqual(termsForSource('met', ['landscape']), ['Landscapes']);
});

test('several categories merge their terms, in selection order', () => {
  assert.deepEqual(termsForSource('met', ['war', 'portrait']), ['War', 'Battle', 'Portraits']);
});

test('a term shared by two selected categories is listed once', () => {
  const merged = termsForSource('aic', ['religious', 'religious']);
  assert.equal(merged.length, new Set(merged).size);
  assert.deepEqual(merged, termsForSource('aic', ['religious']));
});

test('an unknown category, or a source without a mapping, contributes nothing', () => {
  assert.deepEqual(termsForSource('aic', ['no-such-category']), []);
  assert.deepEqual(termsForSource('no-such-source', ['landscape']), []);
  assert.deepEqual(termsForSource('aic', []), []);
});

test('no selection means every source qualifies (no subject filter)', () => {
  assert.equal(sourceSupports('aic', []), true);
  assert.equal(sourceSupports('no-such-source', []), true);
});

test('a source with no terms for any selected category does not qualify', () => {
  assert.equal(sourceSupports('no-such-source', ['landscape']), false);
  assert.equal(sourceSupports('aic', ['no-such-category']), false);
});

test('a source qualifies when it maps at least one of the selected categories', () => {
  assert.equal(sourceSupports('aic', ['no-such-category', 'war']), true);
});

test('every listed term is a non-empty string, without stray whitespace', () => {
  for (const key of CATEGORY_KEYS) {
    for (const [source, terms] of Object.entries(CATEGORIES[key])) {
      for (const term of terms) {
        assert.equal(typeof term, 'string', `${key}/${source}`);
        assert.ok(term.length > 0 && term === term.trim(), `${key}/${source}: "${term}"`);
      }
    }
  }
});
