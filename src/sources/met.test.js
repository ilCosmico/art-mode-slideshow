const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSearchUrl, tagQuery, unionIds, intersectIds } = require('./met');

function paramNames(url) {
  return [...new URL(url).searchParams.keys()];
}

test('q is always the last parameter, whichever filters are set', () => {
  const urls = [
    buildSearchUrl({ query: 'landscape' }),
    buildSearchUrl({ regionFilter: 'Italy', field: 'tags', query: 'Landscapes' }),
    buildSearchUrl({ regionFilter: 'Italy', field: 'artistOrCulture', query: 'Monet' }),
  ];
  for (const url of urls) assert.equal(paramNames(url).at(-1), 'q', url);
});

test('a subject search sets tags=true, an artist search sets artistOrCulture=true, never both', () => {
  const tags = new URL(buildSearchUrl({ field: 'tags', query: 'Saints' })).searchParams;
  assert.equal(tags.get('tags'), 'true');
  assert.equal(tags.get('artistOrCulture'), null);
  const artist = new URL(buildSearchUrl({ field: 'artistOrCulture', query: 'Monet' })).searchParams;
  assert.equal(artist.get('artistOrCulture'), 'true');
  assert.equal(artist.get('tags'), null);
});

test('the fixed painting and public-domain filters are always present', () => {
  const params = new URL(buildSearchUrl({ query: 'sea' })).searchParams;
  assert.equal(params.get('hasImages'), 'true');
  assert.equal(params.get('isPublicDomain'), 'true');
  assert.equal(params.get('medium'), 'Paintings');
  assert.equal(params.get('geoLocation'), null);
});

test('a multi-word tag is quoted so it is matched as a phrase, a single word is not', () => {
  assert.equal(tagQuery('Still Life'), '"Still Life"');
  assert.equal(tagQuery('Virgin Mary'), '"Virgin Mary"');
  assert.equal(tagQuery('Saints'), 'Saints');
  assert.equal(new URL(buildSearchUrl({ field: 'tags', query: tagQuery('Still Life') })).searchParams.get('q'), '"Still Life"');
});

test('unionIds merges lists without duplicates', () => {
  assert.deepEqual(unionIds([[1, 2, 3], [3, 4], [], [2, 5]]), [1, 2, 3, 4, 5]);
  assert.deepEqual(unionIds([]), []);
});

test('intersectIds keeps only ids present in both lists', () => {
  assert.deepEqual(intersectIds([1, 2, 3, 4], [4, 2, 9]), [2, 4]);
  assert.deepEqual(intersectIds([1, 2], [3, 4]), []);
  assert.deepEqual(intersectIds([], [1]), []);
});
