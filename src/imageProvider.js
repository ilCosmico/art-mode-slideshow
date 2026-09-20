const fs = require('fs/promises');
const path = require('path');
const config = require('./config');
const cacheIndex = require('./cacheIndex');
const cacheCleanup = require('./cacheCleanup');
const imageDimensions = require('./imageDimensions');
const settingsStore = require('./settingsStore');
const statusLog = require('./statusLog');
const sourceHealth = require('./sourceHealth');
const aic = require('./sources/aic');
const { sourceSupports } = require('./sources/categories');
const { sourceSupportsMovements } = require('./sources/movements');
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
    categories: settings.categories,
    movements: settings.movements,
  };

  // A source is left out for this fetch, not fetched unfiltered, when it
  // has no terms for any selected category, cannot filter by the selected
  // movements, or has been sidelined.
  const remaining = shuffle(enabledSources.filter(
    (s) => !sourceHealth.isSidelined(s)
      && sourceSupports(s, settings.categories)
      && sourceSupportsMovements(s, settings.movements),
  ));
  let lastError;
  while (remaining.length > 0) {
    const sourceName = remaining.pop();
    for (let attempt = 0; attempt < PER_SOURCE_ATTEMPTS; attempt++) {
      // A failed download may have just sidelined the source; don't spend
      // the remaining attempts on it.
      if (sourceHealth.isSidelined(sourceName)) break;
      try {
        const artwork = await SOURCE_FETCHERS[sourceName](sourceParams);
        const { response, cached } = await cacheArtwork(artwork, settings, sourceName);
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
  if (!fallbackEntry) throw lastError || new Error('no enabled source can be used right now (sidelined, or unable to match the selected categories or movements) and the cache is empty');
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

// Only a download that fails counts against the source's health. A
// download that succeeds but is then rejected (wrong shape) is the
// filters doing their job, not the source misbehaving.
async function downloadImage(artwork, sourceName) {
  try {
    const response = await fetch(artwork.imageUrl, {
      headers: { 'User-Agent': config.userAgent, ...artwork.imageHeaders },
    });
    if (!response.ok) throw new Error(`image download failed: ${response.status}`);
    // A bot-check or error page can come back as a 200 HTML document.
    const contentType = response.headers.get('content-type') || '';
    if (contentType.startsWith('text/')) throw new Error(`image download failed: got ${contentType}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    sourceHealth.recordSuccess(sourceName);
    return buffer;
  } catch (err) {
    if (sourceHealth.recordFailure(sourceName)) {
      const minutes = Math.round(sourceHealth.COOLDOWN_MS / 60000);
      const message = `downloads keep failing, skipping this source for ${minutes} minutes`;
      console.error(`Source "${sourceName}" sidelined: ${message}`);
      statusLog.recordError(sourceName, message);
    }
    throw err;
  }
}

async function cacheArtwork(artwork, settings, sourceName) {
  const index = await cacheIndex.loadIndex();
  if (index[artwork.id]) return { response: toResponse(index[artwork.id]), cached: true };

  const ext = path.extname(new URL(artwork.imageUrl).pathname) || '.jpg';
  const filename = `${artwork.id}${ext}`;
  const destPath = path.join(config.cacheDir, filename);

  const buffer = await downloadImage(artwork, sourceName);

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
