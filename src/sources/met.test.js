const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSearchUrl, tagQuery, unionIds, intersectIds, searchIds } = require('./met');
const { createSearchCache } = require('../searchCache');

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

// searchIds() with a stubbed fetch and a private cache, so no request leaves
// the process and each test starts empty.
function stubFetch(t, responses) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(url);
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return { ok: next.ok !== false, status: next.status || 200, json: async () => next.body };
  });
  return calls;
}

function privateCache(options = {}) {
  const clock = { time: 1_000_000 };
  return { cache: createSearchCache({ ttlMs: 60_000, maxEntries: 10, now: () => clock.time, ...options }), clock };
}

test('the same search is sent once, then answered from memory', async (t) => {
  const calls = stubFetch(t, [{ body: { objectIDs: [1, 2, 3] } }]);
  const { cache } = privateCache();
  const search = { field: 'tags', query: 'Saints' };
  assert.deepEqual(await searchIds(search, cache), [1, 2, 3]);
  assert.deepEqual(await searchIds(search, cache), [1, 2, 3]);
  assert.deepEqual(await searchIds(search, cache), [1, 2, 3]);
  assert.equal(calls.length, 1);
});

test('searches that differ in query, field or region are separate entries', async (t) => {
  const calls = stubFetch(t, [
    { body: { objectIDs: [1] } }, { body: { objectIDs: [2] } }, { body: { objectIDs: [3] } }, { body: { objectIDs: [4] } },
  ]);
  const { cache } = privateCache();
  assert.deepEqual(await searchIds({ field: 'tags', query: 'Saints' }, cache), [1]);
  assert.deepEqual(await searchIds({ field: 'tags', query: 'Christ' }, cache), [2]);
  assert.deepEqual(await searchIds({ field: 'artistOrCulture', query: 'Saints' }, cache), [3]);
  assert.deepEqual(await searchIds({ field: 'tags', query: 'Saints', regionFilter: 'Italy' }, cache), [4]);
  assert.equal(calls.length, 4);
});

test('a search is sent again once its lifetime is over', async (t) => {
  const calls = stubFetch(t, [{ body: { objectIDs: [1] } }, { body: { objectIDs: [1, 2] } }]);
  const { cache, clock } = privateCache();
  const search = { field: 'tags', query: 'Saints' };
  await searchIds(search, cache);
  clock.time += 59_999;
  assert.deepEqual(await searchIds(search, cache), [1]);
  clock.time += 1;
  assert.deepEqual(await searchIds(search, cache), [1, 2]);
  assert.equal(calls.length, 2);
});

test('a failed search is not remembered: an error status is retried', async (t) => {
  const calls = stubFetch(t, [{ ok: false, status: 403 }, { body: { objectIDs: [7] } }]);
  const { cache } = privateCache();
  const search = { field: 'tags', query: 'Saints' };
  await assert.rejects(() => searchIds(search, cache), /Met search failed: 403/);
  assert.deepEqual(await searchIds(search, cache), [7]);
  assert.equal(calls.length, 2);
});

test('a failed search is not remembered: a network error or an unreadable body is retried', async (t) => {
  const calls = stubFetch(t, [new Error('fetch failed'), { body: null }, { body: { objectIDs: [7] } }]);
  const { cache } = privateCache();
  const search = { field: 'tags', query: 'Saints' };
  await assert.rejects(() => searchIds(search, cache), /fetch failed/);
  await assert.rejects(() => searchIds(search, cache));
  assert.deepEqual(await searchIds(search, cache), [7]);
  assert.equal(calls.length, 3);
});

test('an empty result is not remembered, so it is searched again next time', async (t) => {
  const calls = stubFetch(t, [{ body: { total: 0, objectIDs: null } }, { body: { objectIDs: [5] } }]);
  const { cache } = privateCache();
  const search = { field: 'tags', query: 'War' };
  assert.deepEqual(await searchIds(search, cache), []);
  assert.deepEqual(await searchIds(search, cache), [5]);
  assert.equal(calls.length, 2);
});

test('several subject tags cost one search each the first time and none after that', async (t) => {
  const tags = ['Saints', 'Christ', 'Virgin Mary', 'Madonna', 'Angels', 'Crucifixion', 'Jesus'];
  const calls = stubFetch(t, tags.map((_, i) => ({ body: { objectIDs: [i, 100 + i] } })));
  const { cache } = privateCache();
  for (let fetchNumber = 0; fetchNumber < 5; fetchNumber++) {
    const perTag = [];
    for (const tag of tags) perTag.push(await searchIds({ field: 'tags', query: tagQuery(tag) }, cache));
    assert.equal(unionIds(perTag).length, 14);
  }
  assert.equal(calls.length, 7);
});
