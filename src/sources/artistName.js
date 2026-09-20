// Both museums use a handful of standard phrases when the artist isn't
// known, instead of just leaving the field empty. Verified live, within
// this app's actual Paintings/public-domain scope:
//   AIC:  "Artist Unknown\nChinese", "Artist unknown (American, 18th century)",
//         "Unidentified artist\nJapanese, active 19th century", "Anonymous\nJapanese"
//   Met:  "Unidentified artist", "Unknown", "Unknown Artist",
//         "Anonymous, Czech, early 20th century"
const UNKNOWN_ARTIST_PHRASES = new Set([
  'unknown',
  'unknown artist',
  'artist unknown',
  'unidentified artist',
  'anonymous',
]);

// AIC appends culture/period after a newline or in a trailing "(...)";
// Met sometimes appends ", <culture>, <era>" after "Anonymous". Strip
// that trailing context before matching, so "Artist unknown (American,
// 18th century)" and "Anonymous, Czech, early 20th century" both resolve
// to their bare unknown-artist phrase.
//
// Only the first line is kept as the name: AIC's artist_display puts a
// biography on later lines (e.g. "Born Moscow (...), 1866; died
// Neuilly-sur-Seine, France, 1944"), which doesn't belong in a caption.
function normalizeArtist(rawArtist) {
  if (!rawArtist) return '';
  const firstLine = rawArtist.split('\n')[0];
  const leadPhrase = firstLine.split(/[,(]/)[0].trim().toLowerCase();
  return UNKNOWN_ARTIST_PHRASES.has(leadPhrase) ? '' : firstLine.trim();
}

module.exports = { normalizeArtist };
