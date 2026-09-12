const fs = require('fs/promises');
const path = require('path');
const config = require('./config');

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

async function getRandomEntry() {
  const index = await loadIndex();
  const entries = Object.values(index);
  if (entries.length === 0) return null;
  return entries[Math.floor(Math.random() * entries.length)];
}

module.exports = { loadIndex, saveIndex, getRandomEntry };
