const test = require('node:test');
const assert = require('node:assert/strict');
const { createSearchCache } = require('./searchCache');

function setup(options = {}) {
  const clock = { time: 1_000_000 };
  const cache = createSearchCache({ ttlMs: 60_000, maxEntries: 3, now: () => clock.time, ...options });
  return { cache, clock };
}

test('an unknown key returns undefined', () => {
  const { cache } = setup();
  assert.equal(cache.get('missing'), undefined);
});

test('a stored value is returned until it expires', () => {
  const { cache, clock } = setup();
  cache.set('a', [1, 2, 3]);
  assert.deepEqual(cache.get('a'), [1, 2, 3]);
  clock.time += 59_999;
  assert.deepEqual(cache.get('a'), [1, 2, 3]);
});

test('a value is gone exactly when its lifetime is over', () => {
  const { cache, clock } = setup();
  cache.set('a', [1]);
  clock.time += 60_000;
  assert.equal(cache.get('a'), undefined);
});

test('reading a value does not extend its lifetime', () => {
  const { cache, clock } = setup();
  cache.set('a', [1]);
  clock.time += 40_000;
  cache.get('a');
  clock.time += 20_000;
  assert.equal(cache.get('a'), undefined);
});

test('storing a key again replaces the value and restarts its lifetime', () => {
  const { cache, clock } = setup();
  cache.set('a', [1]);
  clock.time += 50_000;
  cache.set('a', [2]);
  clock.time += 50_000;
  assert.deepEqual(cache.get('a'), [2]);
});

test('keys are independent', () => {
  const { cache, clock } = setup();
  cache.set('a', [1]);
  clock.time += 30_000;
  cache.set('b', [2]);
  clock.time += 30_000;
  assert.equal(cache.get('a'), undefined);
  assert.deepEqual(cache.get('b'), [2]);
});

test('the size bound drops the oldest entry first', () => {
  const { cache } = setup();
  cache.set('a', [1]);
  cache.set('b', [2]);
  cache.set('c', [3]);
  cache.set('d', [4]);
  assert.equal(cache.get('a'), undefined);
  assert.deepEqual(cache.get('b'), [2]);
  assert.deepEqual(cache.get('c'), [3]);
  assert.deepEqual(cache.get('d'), [4]);
});

test('an entry that was read recently outlives an older one that was not', () => {
  const { cache } = setup();
  cache.set('a', [1]);
  cache.set('b', [2]);
  cache.set('c', [3]);
  cache.get('a');
  cache.set('d', [4]);
  assert.deepEqual(cache.get('a'), [1]);
  assert.equal(cache.get('b'), undefined);
});

test('expired entries are cleared before a live one has to make room', () => {
  const { cache, clock } = setup();
  cache.set('old-1', [1]);
  cache.set('old-2', [2]);
  clock.time += 30_000;
  cache.set('live', [3]);
  // Reading moves the two old entries after "live" in recency, though they
  // are the ones that expire first.
  cache.get('old-1');
  cache.get('old-2');
  clock.time += 30_000;
  // old-1 and old-2 are expired now, "live" is not, and the bound is 3.
  cache.set('d', [4]);
  cache.set('e', [5]);
  assert.deepEqual(cache.get('live'), [3]);
  assert.deepEqual(cache.get('d'), [4]);
  assert.deepEqual(cache.get('e'), [5]);
});

test('the bound holds however many different keys are stored', () => {
  const { cache } = setup({ maxEntries: 5 });
  for (let i = 0; i < 50; i++) cache.set(`key-${i}`, [i]);
  const alive = Array.from({ length: 50 }, (_, i) => cache.get(`key-${i}`)).filter((v) => v !== undefined);
  assert.equal(alive.length, 5);
  assert.deepEqual(alive, [[45], [46], [47], [48], [49]]);
});
