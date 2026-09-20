const test = require('node:test');
const assert = require('node:assert/strict');
const { createSourceHealth } = require('./sourceHealth');

function setup(options = {}) {
  const clock = { time: 1_000_000 };
  const health = createSourceHealth({
    failureThreshold: 3,
    cooldownMs: 60_000,
    now: () => clock.time,
    ...options,
  });
  return { health, clock };
}

test('a source with no recorded failures is not sidelined', () => {
  const { health } = setup();
  assert.equal(health.isSidelined('aic'), false);
  assert.deepEqual(health.getSidelined(), []);
});

test('failures below the threshold do not sideline the source', () => {
  const { health } = setup();
  assert.equal(health.recordFailure('aic'), false);
  assert.equal(health.recordFailure('aic'), false);
  assert.equal(health.isSidelined('aic'), false);
});

test('reaching the threshold sidelines the source and reports it once', () => {
  const { health } = setup();
  health.recordFailure('aic');
  health.recordFailure('aic');
  assert.equal(health.recordFailure('aic'), true);
  assert.equal(health.isSidelined('aic'), true);
  // A failure landing while already sidelined (e.g. a request that was in
  // flight) neither restarts the cooldown nor announces it again.
  assert.equal(health.recordFailure('aic'), false);
});

test('a success in between resets the streak', () => {
  const { health } = setup();
  health.recordFailure('aic');
  health.recordFailure('aic');
  health.recordSuccess('aic');
  health.recordFailure('aic');
  health.recordFailure('aic');
  assert.equal(health.isSidelined('aic'), false);
});

test('sources are tracked independently', () => {
  const { health } = setup();
  for (let i = 0; i < 3; i++) health.recordFailure('aic');
  assert.equal(health.isSidelined('aic'), true);
  assert.equal(health.isSidelined('met'), false);
});

test('the source is available again once the cooldown has passed', () => {
  const { health, clock } = setup();
  for (let i = 0; i < 3; i++) health.recordFailure('aic');
  clock.time += 59_999;
  assert.equal(health.isSidelined('aic'), true);
  clock.time += 1;
  assert.equal(health.isSidelined('aic'), false);
  assert.deepEqual(health.getSidelined(), []);
});

test('after the cooldown, a single failed probe sidelines the source again', () => {
  const { health, clock } = setup();
  for (let i = 0; i < 3; i++) health.recordFailure('aic');
  clock.time += 60_000;
  assert.equal(health.recordFailure('aic'), true);
  assert.equal(health.isSidelined('aic'), true);
  clock.time += 60_000;
  assert.equal(health.isSidelined('aic'), false);
});

test('after the cooldown, a successful probe fully recovers the source', () => {
  const { health, clock } = setup();
  for (let i = 0; i < 3; i++) health.recordFailure('aic');
  clock.time += 60_000;
  health.recordSuccess('aic');
  // Back to a clean slate: it takes a whole new streak to sideline it.
  assert.equal(health.recordFailure('aic'), false);
  assert.equal(health.recordFailure('aic'), false);
  assert.equal(health.isSidelined('aic'), false);
});

test('getSidelined lists only sources in cooldown, with their retry time', () => {
  const { health, clock } = setup();
  for (let i = 0; i < 3; i++) health.recordFailure('aic');
  health.recordFailure('met');
  assert.deepEqual(health.getSidelined(), [
    { source: 'aic', failures: 3, until: new Date(clock.time + 60_000).toISOString() },
  ]);
});
