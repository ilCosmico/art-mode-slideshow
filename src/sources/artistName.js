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
function isUnknownArtist(rawArtist) {
  if (!rawArtist) return false;
  const leadPhrase = rawArtist.split('\n')[0].split(/[,(]/)[0].trim().toLowerCase();
  return UNKNOWN_ARTIST_PHRASES.has(leadPhrase);
}

// Only the first line is kept as the name: a display name can carry a
// biography on later lines (e.g. "Born Moscow (...), 1866; died
// Neuilly-sur-Seine, France, 1944"), which doesn't belong in a caption.
// Used for Met, which has no cleaner field than its display name.
function normalizeArtist(rawArtist) {
  if (!rawArtist || isUnknownArtist(rawArtist)) return '';
  return rawArtist.split('\n')[0].trim();
}

// AIC's artist_title is its canonical, clean name ("Claude Monet") where
// artist_display adds nationality and dates. artist_title is empty for
// most unknown-artist and culture-only records, but on some it holds a
// culture label instead ("French School", "Italian") while artist_display
// says "Artist unknown (...)": those are unknown artists too, so
// artist_display is still checked first. artist_title stays AIC's own
// spelling, which can differ from the familiar name ("Hilaire Germain
// Edgar Degas"); it is also the field the artist filter matches against,
// so a caption can always be typed back as a filter.
function normalizeAicArtist({ artist_title: artistTitle, artist_display: artistDisplay }) {
  if (isUnknownArtist(artistDisplay)) return '';
  return (artistTitle || '').trim();
}

module.exports = { normalizeArtist, normalizeAicArtist };
