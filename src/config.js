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

// Unset by default (null, not a numeric fallback): cache cleanup is
// opt-in, so anyone who hasn't touched it keeps today's behavior of
// never removing anything.
function parseOptionalNumberEnv(name) {
  const raw = process.env[name];
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  userAgent: 'art-mode-slideshow/0.1 (+https://github.com/)',
  // AIC's API docs ("Authentication") ask every client to send its
  // project name and a contact in this header. Their image host returns a
  // bot-check 403 to requests that lack it.
  aicUserAgent: 'art-mode-slideshow (https://github.com/ilCosmico/art-mode-slideshow)',
  port: parseIntEnv('PORT', 3000),
  slideIntervalMinutes: parseIntEnv('SLIDE_INTERVAL_MINUTES', 15),
  crossfadeSeconds: parseIntEnv('CROSSFADE_SECONDS', 3),
  imageSources: parseListEnv('IMAGE_SOURCES', ['aic', 'met']),
  // Which shape bands (see imageDimensions.js) a downloaded image's real
  // width/height ratio must fall into to be kept. Excludes "vertical" by
  // default: this app is meant for a TV, not portrait images.
  shapeFilters: parseListEnv('SHAPE_FILTERS', ['square', 'rectangular', 'panoramic']),
  // Subject categories (see sources/categories.js) an artwork must belong
  // to, any one of them. Empty by default: no subject filter.
  categories: parseListEnv('CATEGORIES', []),
  // Both null (disabled) by default. Cleanup runs opportunistically
  // right after a fresh download, not on a timer - see cacheCleanup.js.
  cacheMaxAgeDays: parseOptionalNumberEnv('CACHE_MAX_AGE_DAYS'),
  cacheMaxSizeMb: parseOptionalNumberEnv('CACHE_MAX_SIZE_MB'),
  localImagesPath: process.env.LOCAL_IMAGES_PATH || null,
  cacheDir: path.resolve(process.env.CACHE_DIR || './cache'),
  // Holds settings.json, written by the /settings panel. Separate from
  // CACHE_DIR so the two bind mounts can be reasoned about independently.
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
};
