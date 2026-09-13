const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

// settingsStore persists to config.dataDir, which config.js reads from
// DATA_DIR once at require time - set it to a scratch directory before
// requiring anything, so this test never touches the real data volume.
const tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'art-mode-settings-test-'));
process.env.DATA_DIR = tempDataDir;

const settingsStore = require('./settingsStore');

test.after(() => {
  fs.rmSync(tempDataDir, { recursive: true, force: true });
});

test('rejects a non-positive slideIntervalMinutes', async () => {
  await assert.rejects(() => settingsStore.update({ slideIntervalMinutes: 0 }));
  await assert.rejects(() => settingsStore.update({ slideIntervalMinutes: -5 }));
});

test('accepts zero for crossfadeSeconds but rejects negative', async () => {
  await assert.rejects(() => settingsStore.update({ crossfadeSeconds: -1 }));
  const updated = await settingsStore.update({ crossfadeSeconds: 0 });
  assert.equal(updated.crossfadeSeconds, 0);
});

test('rejects an empty imageSources array', async () => {
  await assert.rejects(() => settingsStore.update({ imageSources: [] }));
});

test('rejects an unknown imageSources value', async () => {
  await assert.rejects(() => settingsStore.update({ imageSources: ['bogus'] }));
});

test('rejects an empty shapeFilters array', async () => {
  await assert.rejects(() => settingsStore.update({ shapeFilters: [] }));
});

test('rejects an unknown shapeFilters band', async () => {
  await assert.rejects(() => settingsStore.update({ shapeFilters: ['diagonal'] }));
});

test('rejects a captionMode outside the known set', async () => {
  await assert.rejects(() => settingsStore.update({ captionMode: 'sideways' }));
});

test('rejects a captionPosition outside the known set', async () => {
  await assert.rejects(() => settingsStore.update({ captionPosition: 'middle' }));
});

test('rejects an unknown top-level setting key', async () => {
  await assert.rejects(() => settingsStore.update({ notARealSetting: true }));
});

test('a rejected update leaves previously accepted settings untouched', async () => {
  const before = settingsStore.getAll();
  await assert.rejects(() => settingsStore.update({ slideIntervalMinutes: 20, captionMode: 'bogus' }));
  assert.deepEqual(settingsStore.getAll(), before);
});

test('accepts a full valid update and reflects it in getAll()', async () => {
  const updated = await settingsStore.update({
    slideIntervalMinutes: 20,
    imageSources: ['aic'],
    shapeFilters: ['vertical', 'panoramic'],
    artistFilter: '  Monet;Rembrandt  ',
    regionFilter: '',
    showCaption: 1,
    captionMode: 'fixed',
    captionDelaySeconds: 5,
    captionPosition: 'top-center',
  });
  assert.equal(updated.slideIntervalMinutes, 20);
  assert.deepEqual(updated.imageSources, ['aic']);
  assert.deepEqual(updated.shapeFilters, ['vertical', 'panoramic']);
  assert.equal(updated.artistFilter, 'Monet;Rembrandt');
  assert.equal(updated.showCaption, true);
  assert.equal(updated.captionMode, 'fixed');
  assert.equal(updated.captionPosition, 'top-center');
  assert.deepEqual(updated, settingsStore.getAll());
});
