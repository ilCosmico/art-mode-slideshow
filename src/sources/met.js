const config = require('../config');
const { pickRandom } = require('./filterList');
const { normalizeArtist } = require('./artistName');
const { translateArtist, translateRegion } = require('./translations');
const { termsForSource } = require('./categories');
const { randomElement } = require('../random');
const searchCache = require('../searchCache');

const SEARCH_TERMS = [
  'landscape', 'portrait', 'still life', 'flowers', 'mountains',
  'river', 'sea', 'forest', 'city', 'abstract', 'sculpture', 'garden',
];
const MAX_ATTEMPTS = 20;

// `q` takes a single term and `artistOrCulture` / `tags` only say where to
// look for it (setting both would match either), so each artist or subject
// term is its own search; fetchRandomArtwork() combines the results.
function buildSearchUrl({ regionFilter, field, query }) {
  const params = new URLSearchParams();
  params.set('hasImages', 'true');
  params.set('isPublicDomain', 'true');
  params.set('medium', 'Paintings');
  if (regionFilter) params.set('geoLocation', regionFilter);
  if (field) params.set(field, 'true');
  // `q` must be the LAST param in the query string or Met's search
  // silently returns zero results (verified live: identical params,
  // only reordered, go from 0 to dozens of results) - undocumented, but
  // reproducible. Set it last, always, regardless of which filters above
  // are present.
  params.set('q', query);
  return `https://collectionapi.metmuseum.org/public/collection/v1/search?${params.toString()}`;
}

// Unquoted, a multi-word tag search matches any of the words (verified
// live: "God the Father" gives 814 works unquoted, 15 quoted, and none of
// eight sampled unquoted results carried the tag), so a phrase is quoted.
function tagQuery(term) {
  return /\s/.test(term) ? `"${term}"` : term;
}

function unionIds(idLists) {
  return [...new Set(idLists.flat())];
}

function intersectIds(a, b) {
  const inB = new Set(b);
  return a.filter((id) => inB.has(id));
}

// Each search is remembered for a while, keyed by its exact URL (region,
// field and query), because a fetch with a subject filter runs one search per
// tag. A failed search throws before anything is stored, and an empty result
// is not kept either, so a search that came back empty by mistake is not
// repeated as empty for hours. The cached lists are shared, callers must
// not modify them (unionIds and intersectIds build new ones).
async function searchIds(search, cache = searchCache) {
  const searchUrl = buildSearchUrl(search);
  const cached = cache.get(searchUrl);
  if (cached) return cached;
  const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': config.userAgent } });
  if (!searchRes.ok) throw new Error(`Met search failed: ${searchRes.status}`);
  const searchData = await searchRes.json();
  const ids = searchData.objectIDs || [];
  if (ids.length > 0) cache.set(searchUrl, ids);
  return ids;
}

// An artist and a subject are both required, so their result sets are
// intersected; the terms of the selected subjects are alternatives, so
// theirs are merged. With neither, it falls back to a random generic term.
async function findObjectIds({ artist, region, subjectTerms }) {
  let ids = null;
  if (artist) {
    ids = await searchIds({ regionFilter: region, field: 'artistOrCulture', query: artist });
  }
  if (subjectTerms.length > 0) {
    const perTerm = [];
    for (const term of subjectTerms) {
      perTerm.push(await searchIds({ regionFilter: region, field: 'tags', query: tagQuery(term) }));
    }
    const subjectIds = unionIds(perTerm);
    ids = ids === null ? subjectIds : intersectIds(ids, subjectIds);
  }
  if (ids === null) ids = await searchIds({ regionFilter: region, query: randomElement(SEARCH_TERMS) });
  return ids;
}

async function fetchRandomArtwork({ artistFilter, regionFilter, categories = [] } = {}) {
  // Picked once per call, same as aic.js: artistFilter/regionFilter may
  // hold several ";"-separated values, and the searches below are reused
  // across every attempt, so they must stay fixed for the whole call.
  const artist = translateArtist(pickRandom(artistFilter));
  const region = translateRegion(pickRandom(regionFilter));
  const ids = await findObjectIds({ artist, region, subjectTerms: termsForSource('met', categories) });
  if (ids.length === 0) throw new Error('Met search returned no results for the current filters');

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

module.exports = { fetchRandomArtwork, buildSearchUrl, tagQuery, unionIds, intersectIds, searchIds };
