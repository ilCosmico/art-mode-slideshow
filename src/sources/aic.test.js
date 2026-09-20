const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSearchUrl } = require('./aic');

function queryParams(url) {
  return Object.fromEntries(new URL(url).searchParams.entries());
}

test('without subject terms there is no subject clause', () => {
  const params = queryParams(buildSearchUrl(1, { artistFilter: '', regionFilter: '' }));
  assert.equal(Object.keys(params).some((k) => k.includes('subject_titles')), false);
});

test('subject terms become one exact "terms" clause on the keyword field', () => {
  const params = queryParams(buildSearchUrl(1, { subjectTerms: ['landscapes', 'landscape'] }));
  const termsKeys = Object.keys(params).filter((k) => k.includes('[terms][subject_titles.keyword]'));
  assert.equal(termsKeys.length, 2);
  assert.deepEqual(termsKeys.map((k) => params[k]).sort(), ['landscape', 'landscapes']);
});

test('a single-value clause keeps its plain key, so artist and region are unchanged', () => {
  const params = queryParams(buildSearchUrl(1, { artistFilter: 'Monet', regionFilter: 'France', subjectTerms: ['war'] }));
  assert.equal(params['query[bool][must][1][match][artist_title]'], 'Monet');
  assert.equal(params['query[bool][must][2][match][place_of_origin]'], 'France');
});

test('the subject clause sits alongside the artist clause, so both must match', () => {
  const params = queryParams(buildSearchUrl(1, { artistFilter: 'Monet', subjectTerms: ['portraits'] }));
  const clauseIndexes = new Set(Object.keys(params).map((k) => k.match(/\[must\]\[(\d+)\]/)?.[1]).filter(Boolean));
  // painting type, artist, subject, public domain
  assert.equal(clauseIndexes.size, 4);
});

test('without style terms there is no style clause', () => {
  const params = queryParams(buildSearchUrl(1, { subjectTerms: ['war'] }));
  assert.equal(Object.keys(params).some((k) => k.includes('style_titles')), false);
});

test('style terms become one exact "terms" clause on style_titles.keyword', () => {
  const params = queryParams(buildSearchUrl(1, { styleTerms: ['Impressionism', 'Realism'] }));
  const keys = Object.keys(params).filter((k) => k.includes('[terms][style_titles.keyword]'));
  assert.equal(keys.length, 2);
  assert.deepEqual(keys.map((k) => params[k]).sort(), ['Impressionism', 'Realism']);
});

test('a style clause never leaks a text match on the movement: Impressionism does not become a word search', () => {
  const params = queryParams(buildSearchUrl(1, { styleTerms: ['Impressionism'] }));
  assert.equal(Object.keys(params).some((k) => k.includes('[match][style_title')), false);
});

test('subject, style and artist clauses all sit in the same query, so all must match', () => {
  const params = queryParams(buildSearchUrl(1, { artistFilter: 'Monet', subjectTerms: ['landscapes'], styleTerms: ['Impressionism'] }));
  const clauseIndexes = new Set(Object.keys(params).map((k) => k.match(/\[must\]\[(\d+)\]/)?.[1]).filter(Boolean));
  // painting type, artist, subject, style, public domain
  assert.equal(clauseIndexes.size, 5);
});
