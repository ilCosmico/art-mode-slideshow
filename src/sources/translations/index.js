// Pluggable per-language translation: every .js file in this directory
// (other than this one) is loaded automatically and merged into a
// single case-insensitive lookup at startup. Adding a language means
// adding one file shaped like { regions: {...}, artists: {...} } - no
// change needed here or in aic.js/met.js.
//
// Still a static local dictionary, no external translation API: no
// extra network dependency in the critical path, no new point of
// failure, 100% reliable on the terms it covers.
const fs = require('fs');
const path = require('path');

function loadLanguageFiles() {
  return fs.readdirSync(__dirname)
    .filter((file) => file.endsWith('.js') && file !== path.basename(__filename))
    .map((file) => require(path.join(__dirname, file)));
}

function buildLookup(category) {
  const lookup = {};
  for (const language of loadLanguageFiles()) {
    for (const [term, translated] of Object.entries(language[category] || {})) {
      lookup[term.toLowerCase()] = translated;
    }
  }
  return lookup;
}

const REGION_LOOKUP = buildLookup('regions');
const ARTIST_LOOKUP = buildLookup('artists');

function translate(lookup, value) {
  if (!value) return value;
  const translated = lookup[value.trim().toLowerCase()];
  return translated || value;
}

function translateRegion(value) {
  return translate(REGION_LOOKUP, value);
}

function translateArtist(value) {
  return translate(ARTIST_LOOKUP, value);
}

module.exports = { translateRegion, translateArtist };
