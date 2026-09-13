const fs = require('fs/promises');
const path = require('path');
const config = require('./config');
const cacheIndex = require('./cacheIndex');
const cacheCleanup = require('./cacheCleanup');
const imageDimensions = require('./imageDimensions');
const settingsStore = require('./settingsStore');
const statusLog = require('./statusLog');
const aic = require('./sources/aic');
const met = require('./sources/met');
const local = require('./sources/local');

const SOURCE_FETCHERS = {
  aic: aic.fetchRandomArtwork,
  met: met.fetchRandomArtwork,
};

// A source's own metadata-based checks can be wrong (e.g. a museum's
// declared physical measurement not matching the photographed image's
// real pixel orientation), so one rejected download shouldn't disqualify
// the whole source - fetch a fresh candidate from it a few times before
// moving on to the next enabled source.
const PER_SOURCE_ATTEMPTS = 3;

async function getNextArtwork() {
  if (config.localImagesPath) {
    try {
      const response = await local.getRandomLocalArtwork(config.localImagesPath);
      statusLog.recordSuccess({ source: response.source, title: response.title, cached: false });
      return response;
    } catch (err) {
      statusLog.recordError('local', err.message);
      throw err;
    }
  }

  const settings = settingsStore.getAll();
  const enabledSources = settings.imageSources.filter((s) => SOURCE_FETCHERS[s]);
  if (enabledSources.length === 0) {
    throw new Error('no valid entries in imageSources');
  }
  const sourceParams = {
    artistFilter: settings.artistFilter,
    regionFilter: settings.regionFilter,
    shapeFilters: settings.shapeFilters,
  };

  const remaining = shuffle(enabledSources);
  let lastError;
  while (remaining.length > 0) {
    const sourceName = remaining.pop();
    for (let attempt = 0; attempt < PER_SOURCE_ATTEMPTS; attempt++) {
      try {
        const artwork = await SOURCE_FETCHERS[sourceName](sourceParams);
        const { response, cached } = await cacheArtwork(artwork, settings);
        statusLog.recordSuccess({ source: response.source, title: response.title, cached });
        return response;
      } catch (err) {
        console.error(`Source "${sourceName}" failed (attempt ${attempt + 1}/${PER_SOURCE_ATTEMPTS}): ${err.message}`);
        statusLog.recordError(sourceName, err.message);
        lastError = err;
      }
    }
  }

  const fallbackEntry = await cacheIndex.getRandomEntry(settings.shapeFilters);
  if (!fallbackEntry) throw lastError;
  const response = toResponse(fallbackEntry);
  statusLog.recordSuccess({ source: response.source, title: response.title, cached: true });
  return response;
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function cacheArtwork(artwork, settings) {
  const index = await cacheIndex.loadIndex();
  if (index[artwork.id]) return { response: toResponse(index[artwork.id]), cached: true };

  const ext = path.extname(new URL(artwork.imageUrl).pathname) || '.jpg';
  const filename = `${artwork.id}${ext}`;
  const destPath = path.join(config.cacheDir, filename);

  const fetchResponse = await fetch(artwork.imageUrl, { headers: { 'User-Agent': config.userAgent } });
  if (!fetchResponse.ok) throw new Error(`image download failed: ${fetchResponse.status}`);
  const buffer = Buffer.from(await fetchResponse.arrayBuffer());

  // Authoritative orientation check: a source's declared metadata (a
  // physical measurement, a thumbnail size) can disagree with the real
  // photographed image, so decide on the actual downloaded pixels and
  // reject before anything touches disk or the cache index.
  const { width, height } = imageDimensions.getImageDimensions(buffer);
  const shapeBand = imageDimensions.getShapeBand(width / height);
  if (!settings.shapeFilters.includes(shapeBand)) {
    throw new Error(`downloaded image "${artwork.id}" doesn't match shapeFilters [${settings.shapeFilters}]`);
  }

  await fs.mkdir(config.cacheDir, { recursive: true });
  await fs.writeFile(destPath, buffer);

  const entry = {
    id: artwork.id,
    filename,
    title: artwork.title,
    artist: artwork.artist,
    source: artwork.source,
    sourceUrl: artwork.sourceUrl,
    shapeBand,
    cachedAt: new Date().toISOString(),
  };
  index[artwork.id] = entry;

  const cleaned = await cacheCleanup.cleanup({
    cacheDir: config.cacheDir,
    index,
    newestId: artwork.id,
    maxAgeDays: settings.cacheMaxAgeDays,
    maxSizeMb: settings.cacheMaxSizeMb,
  });
  if (cleaned) console.log(`Cache cleanup removed entries (maxAgeDays=${settings.cacheMaxAgeDays}, maxSizeMb=${settings.cacheMaxSizeMb})`);

  await cacheIndex.saveIndex(index);
  return { response: toResponse(entry), cached: false };
}

function toResponse(entry) {
  return {
    url: `/cache/${entry.filename}`,
    title: entry.title,
    artist: entry.artist,
    source: entry.source,
    sourceUrl: entry.sourceUrl,
  };
}

module.exports = { getNextArtwork };
