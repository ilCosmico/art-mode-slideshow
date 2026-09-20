// Consecutive failed downloads before a source is sidelined. Kept above
// the per-request attempt count in imageProvider.js (3) so one unlucky
// request or a brief network blip can't sideline a source by itself: it
// takes failures across at least two requests in a row.
const FAILURE_THRESHOLD = 5;
// How long a sidelined source is skipped. Equal to the default slide
// interval: a source that stays broken costs one probe attempt per
// cooldown instead of three per request, and one that gets fixed is back
// within a slide or two, with no restart.
const COOLDOWN_MS = 15 * 60 * 1000;

// In-memory only, like statusLog.js: after a restart every source gets a
// fresh chance, which is the right default.
function createSourceHealth({ failureThreshold = FAILURE_THRESHOLD, cooldownMs = COOLDOWN_MS, now = Date.now } = {}) {
  const states = new Map();

  function isSidelined(source) {
    const state = states.get(source);
    return !!state && state.sidelinedUntil > now();
  }

  // Returns true when this failure starts a new cooldown. The failure
  // count is kept once the cooldown ends, so the first download that
  // fails afterwards (the probe) sidelines the source again right away.
  function recordFailure(source) {
    const state = states.get(source) || { failures: 0, sidelinedUntil: 0 };
    state.failures += 1;
    states.set(source, state);
    if (state.failures < failureThreshold || state.sidelinedUntil > now()) return false;
    state.sidelinedUntil = now() + cooldownMs;
    return true;
  }

  function recordSuccess(source) {
    states.delete(source);
  }

  function getSidelined() {
    return [...states.entries()]
      .filter(([source]) => isSidelined(source))
      .map(([source, state]) => ({
        source,
        failures: state.failures,
        until: new Date(state.sidelinedUntil).toISOString(),
      }));
  }

  return { isSidelined, recordFailure, recordSuccess, getSidelined };
}

module.exports = { createSourceHealth, COOLDOWN_MS, ...createSourceHealth() };
