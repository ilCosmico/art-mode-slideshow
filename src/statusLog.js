// In-memory only, by design: this is a diagnostic view of "what's
// happening right now", not a persisted history. Resets on restart, and
// doesn't touch the data volume that already holds settings.json.
const MAX_EVENTS = 50;

let events = [];
let lastSuccess = null;

function push(event) {
  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();
}

function recordError(source, message) {
  push({ timestamp: new Date().toISOString(), level: 'error', source, message });
}

function recordSuccess({ source, title, cached }) {
  const event = {
    timestamp: new Date().toISOString(),
    level: 'info',
    source,
    message: `"${title}" (${cached ? 'from cache' : 'fresh download'})`,
  };
  push(event);
  lastSuccess = event;
}

function getStatus() {
  return { lastSuccess, events: [...events].reverse() };
}

module.exports = { recordError, recordSuccess, getStatus };
