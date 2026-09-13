const { randomElement } = require('../random');

// artistFilter/regionFilter accept multiple values separated by ";"
// (e.g. "Monet;Rembrandt"). Each fetchRandomArtwork() call picks one at
// random, the same way met.js already picks a random SEARCH_TERMS entry
// when no filter is set - shared here since both aic.js and met.js need it.
function pickRandom(rawValue) {
  if (!rawValue) return '';
  const values = rawValue.split(';').map((v) => v.trim()).filter(Boolean);
  if (values.length === 0) return '';
  return randomElement(values);
}

module.exports = { pickRandom };
