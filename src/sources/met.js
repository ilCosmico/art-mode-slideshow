const config = require('../config');
const { pickRandom } = require('./filterList');
const { normalizeArtist } = require('./artistName');
const { translateArtist, translateRegion } = require('./translations');
const { randomElement } = require('../random');

const SEARCH_TERMS = [
  'landscape', 'portrait', 'still life', 'flowers', 'mountains',
  'river', 'sea', 'forest', 'city', 'abstract', 'sculpture', 'garden',
];
const MAX_ATTEMPTS = 20;

function buildSearchUrl({ artistFilter, regionFilter }) {
  const params = new URLSearchParams();
  params.set('hasImages', 'true');
  params.set('isPublicDomain', 'true');
  params.set('medium', 'Paintings');
  if (regionFilter) params.set('geoLocation', regionFilter);
  // `q` must be the LAST param in the query string or Met's search
  // silently returns zero results (verified live: identical params,
  // only reordered, go from 0 to dozens of results) - undocumented, but
  // reproducible. Set it last, always, regardless of which filters above
  // are present.
  if (artistFilter) {
    params.set('artistOrCulture', 'true');
    params.set('q', artistFilter);
  } else {
    params.set('q', randomElement(SEARCH_TERMS));
  }
  return `https://collectionapi.metmuseum.org/public/collection/v1/search?${params.toString()}`;
}

async function fetchRandomArtwork({ artistFilter, regionFilter } = {}) {
  // Picked once per call, same as aic.js: artistFilter/regionFilter may
  // hold several ";"-separated values, and this search URL is reused
  // across every attempt below, so it must stay a single fixed value
  // for the whole call.
  const artist = translateArtist(pickRandom(artistFilter));
  const region = translateRegion(pickRandom(regionFilter));
  const searchUrl = buildSearchUrl({ artistFilter: artist, regionFilter: region });
  const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': config.userAgent } });
  if (!searchRes.ok) throw new Error(`Met search failed: ${searchRes.status}`);
  const searchData = await searchRes.json();
  const ids = searchData.objectIDs || [];
  if (ids.length === 0) throw new Error(`Met search returned no results for "${searchUrl}"`);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const objectId = randomElement(ids);
    const objRes = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectId}`, {
      headers: { 'User-Agent': config.userAgent },
    });
    if (!objRes.ok) continue;
    const obj = await objRes.json();
    // Orientation is not checked here: the declared "Overall" physical
    // measurement can disagree with the photographed image's real pixel
    // orientation (mounted works, album leaves), so imageProvider.js
    // checks the actual downloaded pixels instead.
    if (obj.isPublicDomain && obj.primaryImage && obj.classification === 'Paintings') {
      return {
        id: `met-${obj.objectID}`,
        title: obj.title || 'Untitled',
        artist: normalizeArtist(obj.artistDisplayName),
        source: 'Metropolitan Museum of Art',
        sourceUrl: obj.objectURL,
        imageUrl: obj.primaryImage,
      };
    }
  }
  throw new Error('Met: no eligible public-domain artwork found after retries');
}

module.exports = { fetchRandomArtwork };
