const fs = require('fs/promises');
const path = require('path');
const config = require('./config');
const { randomElement } = require('./random');

function indexPath() {
  return path.join(config.cacheDir, 'index.json');
}

async function loadIndex() {
  try {
    const raw = await fs.readFile(indexPath(), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function saveIndex(index) {
  await fs.mkdir(config.cacheDir, { recursive: true });
  await fs.writeFile(indexPath(), JSON.stringify(index, null, 2));
}

// preferredShapeFilters, if given, biases the pick toward entries whose
// stored shapeBand is currently allowed - so falling back to the cache
// doesn't show a filtered-out shape just because it's what's on disk.
// Entries cached before shapeBand was tracked have no band recorded and
// are simply never in that preferred pool, same as any real mismatch.
async function getRandomEntry(preferredShapeFilters) {
  const index = await loadIndex();
  const entries = Object.values(index);
  if (entries.length === 0) return null;

  if (preferredShapeFilters) {
    const matching = entries.filter((e) => e.shapeBand && preferredShapeFilters.includes(e.shapeBand));
    if (matching.length > 0) return randomElement(matching);
  }

  return randomElement(entries);
}

module.exports = { loadIndex, saveIndex, getRandomEntry };
