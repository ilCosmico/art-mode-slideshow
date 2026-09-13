const config = require('../config');
const { pickRandom } = require('./filterList');
const { normalizeArtist } = require('./artistName');
const { translateArtist, translateRegion } = require('./translations');
const { getShapeBand } = require('../imageDimensions');
const { randomElement } = require('../random');

const ARTWORK_FIELDS = 'id,title,artist_display,image_id,is_public_domain,artwork_type_title,thumbnail';
const RESULTS_PER_PAGE = 100;
// AIC's search endpoint caps result-window offset around 1000, so pages
// beyond this 403 regardless of how many results actually match.
const MAX_PAGE = 10;
// Each attempt samples a whole page and needs at least one candidate in
// it that matches the active shape filters; a narrower filter selection
// means more pages can come up empty before one hits.
const MAX_ATTEMPTS = 8;

// Fixed clauses plus whichever optional filters are set, combined as a
// single bool/must array (verified live: AIC doesn't care about clause
// order here, unlike Met's search endpoint - see met.js).
function buildMustClauses({ artistFilter, regionFilter }) {
  const clauses = [{ match: { artwork_type_title: 'Painting' } }];
  if (artistFilter) clauses.push({ match: { artist_title: artistFilter } });
  if (regionFilter) clauses.push({ match: { place_of_origin: regionFilter } });
  clauses.push({ term: { is_public_domain: true } });
  return clauses;
}

function applyMustClauses(params, clauses) {
  clauses.forEach((clause, i) => {
    const [type, fields] = Object.entries(clause)[0];
    const [field, value] = Object.entries(fields)[0];
    params.set(`query[bool][must][${i}][${type}][${field}]`, value);
  });
}

function buildSearchUrl(page, filters) {
  const params = new URLSearchParams({
    fields: ARTWORK_FIELDS,
    limit: String(RESULTS_PER_PAGE),
    page: String(page),
  });
  applyMustClauses(params, buildMustClauses(filters));
  return `https://api.artic.edu/api/v1/artworks/search?${params.toString()}`;
}

// An artist/region filter can shrink the matching set from tens of
// thousands down to a few dozen, so a fixed page range picked for the
// unfiltered case would mostly land on empty pages. Ask AIC how many
// results the current filters actually have, and only sample within
// that real range (still capped at MAX_PAGE for the offset limit above).
async function fetchTotalPages(filters) {
  const params = new URLSearchParams({ fields: 'id', limit: '1', page: '1' });
  applyMustClauses(params, buildMustClauses(filters));
  const url = `https://api.artic.edu/api/v1/artworks/search?${params.toString()}`;
  const res = await fetch(url, { headers: { 'User-Agent': config.userAgent } });
  if (!res.ok) throw new Error(`AIC search failed: ${res.status}`);
  const { pagination } = await res.json();
  const total = pagination?.total || 0;
  if (total === 0) throw new Error('AIC: no results for the current filters');
  return Math.max(1, Math.min(MAX_PAGE, Math.ceil(total / RESULTS_PER_PAGE)));
}

// Cheap pre-filter: AIC's thumbnail dimensions reflect the same photograph
// as the full image, so this reliably skips doomed candidates before
// spending a download on them. imageProvider.js still re-checks the real
// downloaded pixels as the authoritative gate.
function matchesShapeFilters(item, shapeFilters) {
  const { thumbnail } = item;
  return !!thumbnail && shapeFilters.includes(getShapeBand(thumbnail.width / thumbnail.height));
}

async function fetchRandomArtwork({ artistFilter, regionFilter, shapeFilters = ['square', 'rectangular', 'panoramic'] } = {}) {
  // Each value is picked once per call and reused across all its
  // attempts below - artistFilter/regionFilter may hold several
  // ";"-separated values, but mixing a different one in mid-call would
  // make the page count (and the pages themselves) inconsistent.
  const artist = translateArtist(pickRandom(artistFilter));
  const region = translateRegion(pickRandom(regionFilter));
  const totalPages = await fetchTotalPages({ artistFilter: artist, regionFilter: region });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const page = 1 + Math.floor(Math.random() * totalPages);
    const res = await fetch(buildSearchUrl(page, { artistFilter: artist, regionFilter: region }), {
      headers: { 'User-Agent': config.userAgent },
    });
    if (!res.ok) throw new Error(`AIC search failed: ${res.status}`);
    const { data } = await res.json();
    const candidates = (data || []).filter((item) => item.image_id && matchesShapeFilters(item, shapeFilters));
    if (candidates.length === 0) continue;

    const item = randomElement(candidates);
    return {
      id: `aic-${item.id}`,
      title: item.title || 'Untitled',
      artist: normalizeArtist(item.artist_display),
      source: 'Art Institute of Chicago',
      sourceUrl: `https://www.artic.edu/artworks/${item.id}`,
      imageUrl: `https://www.artic.edu/iiif/2/${item.image_id}/full/1686,/0/default.jpg`,
    };
  }
  throw new Error('AIC: no painting matching the shape filters found after retries');
}

module.exports = { fetchRandomArtwork };
