const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

// config.js reads CATEGORIES once at require time, so it has to be set
// before settingsStore is loaded; that is why this is its own test file
// (each file runs in its own process).
process.env.CATEGORIES = 'landscape, bogus ,war';
const tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'art-mode-categories-test-'));
process.env.DATA_DIR = tempDataDir;

const settingsStore = require('./settingsStore');

test.after(() => {
  fs.rmSync(tempDataDir, { recursive: true, force: true });
});

test('CATEGORIES seeds the default, keeping known values and dropping unknown ones', () => {
  assert.deepEqual(settingsStore.getAll().categories, ['landscape', 'war']);
});
