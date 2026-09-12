const path = require('path');

function parseIntEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseListEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

module.exports = {
  userAgent: 'art-mode-slideshow/0.1 (+https://github.com/)',
  port: parseIntEnv('PORT', 3000),
  slideIntervalMinutes: parseIntEnv('SLIDE_INTERVAL_MINUTES', 15),
  crossfadeSeconds: parseIntEnv('CROSSFADE_SECONDS', 3),
  imageSources: parseListEnv('IMAGE_SOURCES', ['aic', 'met']),
  // Which shape bands (see imageDimensions.js) a downloaded image's real
  // width/height ratio must fall into to be kept. Excludes "vertical" by
  // default: this app is meant for a TV, not portrait images.
  shapeFilters: parseListEnv('SHAPE_FILTERS', ['square', 'rectangular', 'panoramic']),
  localImagesPath: process.env.LOCAL_IMAGES_PATH || null,
  cacheDir: path.resolve(process.env.CACHE_DIR || './cache'),
  // Holds settings.json, written by the /settings panel. Separate from
  // CACHE_DIR so the two bind mounts can be reasoned about independently.
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
};
