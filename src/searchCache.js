// How long a remembered search is reused. The list of object ids behind a
// tag or artist search changes rarely (new works are added and old ones
// withdrawn over days, not minutes), so a few hours costs nothing visible:
// a new work is picked up, or a withdrawn one dropped, within this time. An
// id withdrawn in the meantime is skipped by the object lookup like any
// other ineligible id. Long enough that a slideshow at the default 15
// minutes per slide repeats each search once per 24 slides, short enough
// that a long-running container still notices collection changes.
const TTL_MS = 6 * 60 * 60 * 1000;
// Most searches kept at once. One entry is a list of at most a few thousand
// ids, so this keeps the memory in the low megabytes even if many different
// artist filters are tried; the least recently used entry goes first.
const MAX_ENTRIES = 100;

// In-memory only, like sourceHealth.js: it resets on restart, which just
// means the first fetches after a start search again.
function createSearchCache({ ttlMs = TTL_MS, maxEntries = MAX_ENTRIES, now = Date.now } = {}) {
  // Insertion order doubles as recency: the first key is the least recently used.
  const entries = new Map();

  function get(key) {
    const entry = entries.get(key);
    if (!entry) return undefined;
    entries.delete(key);
    if (entry.expiresAt <= now()) return undefined;
    entries.set(key, entry);
    return entry.value;
  }

  function set(key, value) {
    entries.delete(key);
    for (const [otherKey, entry] of entries) {
      if (entry.expiresAt <= now()) entries.delete(otherKey);
    }
    entries.set(key, { value, expiresAt: now() + ttlMs });
    while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
  }

  return { get, set };
}

module.exports = { createSearchCache, TTL_MS, MAX_ENTRIES, ...createSearchCache() };
