const express = require('express');
const path = require('path');
const config = require('./src/config');
const settingsStore = require('./src/settingsStore');
const statusLog = require('./src/statusLog');
const sourceHealth = require('./src/sourceHealth');
const { CATEGORY_KEYS } = require('./src/sources/categories');
const { MOVEMENT_KEYS } = require('./src/sources/movements');
const { getNextArtwork } = require('./src/imageProvider');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/cache', express.static(config.cacheDir));
if (config.localImagesPath) {
  app.use('/local-images', express.static(config.localImagesPath));
}

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

// Subset of settingsStore.getAll() that the carousel actually needs to
// render. The frontend re-polls this every cycle so panel changes reach
// the kiosk page without a manual reload.
app.get('/api/config', (req, res) => {
  const settings = settingsStore.getAll();
  res.json({
    crossfadeSeconds: settings.crossfadeSeconds,
    slideIntervalMinutes: settings.slideIntervalMinutes,
    showCaption: settings.showCaption,
    captionMode: settings.captionMode,
    captionDelaySeconds: settings.captionDelaySeconds,
    captionPosition: settings.captionPosition,
  });
});

app.get('/api/settings', (req, res) => {
  res.json(settingsStore.getAll());
});

app.post('/api/settings', async (req, res) => {
  try {
    const updated = await settingsStore.update(req.body || {});
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/categories', (req, res) => {
  res.json(CATEGORY_KEYS);
});

app.get('/api/movements', (req, res) => {
  res.json(MOVEMENT_KEYS);
});

app.get('/api/status', (req, res) => {
  res.json({ ...statusLog.getStatus(), sidelinedSources: sourceHealth.getSidelined() });
});

app.get('/api/next', async (req, res) => {
  try {
    const artwork = await getNextArtwork();
    res.json(artwork);
  } catch (err) {
    console.error(`Failed to get next artwork: ${err.message}`);
    statusLog.recordError('none', `no artwork available: ${err.message}`);
    res.status(500).json({ error: 'no artwork available' });
  }
});

async function main() {
  await settingsStore.load();
  app.listen(config.port, () => {
    console.log(`art-mode-slideshow listening on port ${config.port}`);
  });
}

main();
