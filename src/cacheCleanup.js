const fs = require('fs/promises');
const path = require('path');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function fileSize(filePath) {
  try {
    return (await fs.stat(filePath)).size;
  } catch (err) {
    if (err.code === 'ENOENT') return 0;
    throw err;
  }
}

async function removeEntry(cacheDir, index, id) {
  await fs.rm(path.join(cacheDir, index[id].filename), { force: true });
  delete index[id];
}

// Runs opportunistically right after a fresh download, rather than on a
// timer. Both limits are optional and independent; either can trigger
// removals. newestId (the entry that was just cached) is never removed
// by either pass - cleanup should never leave the cache unable to serve
// the fetch that just succeeded, even at an extreme setting like a max
// age of 0 or a size cap smaller than a single image.
async function cleanup({ cacheDir, index, newestId, maxAgeDays, maxSizeMb }) {
  let changed = false;

  if (maxAgeDays !== null && maxAgeDays !== undefined) {
    const cutoff = Date.now() - maxAgeDays * MS_PER_DAY;
    for (const id of Object.keys(index)) {
      if (id === newestId) continue;
      if (new Date(index[id].cachedAt).getTime() < cutoff) {
        await removeEntry(cacheDir, index, id);
        changed = true;
      }
    }
  }

  if (maxSizeMb !== null && maxSizeMb !== undefined) {
    const maxBytes = maxSizeMb * 1024 * 1024;
    const entries = await Promise.all(
      Object.keys(index).map(async (id) => ({ id, size: await fileSize(path.join(cacheDir, index[id].filename)) })),
    );
    entries.sort((a, b) => new Date(index[a.id].cachedAt) - new Date(index[b.id].cachedAt)); // oldest first

    let total = entries.reduce((sum, e) => sum + e.size, 0);
    for (const { id, size } of entries) {
      if (total <= maxBytes) break;
      if (id === newestId) continue;
      await removeEntry(cacheDir, index, id);
      total -= size;
      changed = true;
    }
  }

  return changed;
}

module.exports = { cleanup };
