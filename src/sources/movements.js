// Art movements a work can be filtered by, mapped to the exact value AIC
// stores in style_titles. Only AIC has a searchable style field (Met has
// period, culture and department, not movement), so this filter applies to
// AIC alone. Adding a movement means adding one entry here plus its label
// in public/locales/en.json and it.json (movement<Name>Label).
//
// The values come from aggregating style_titles.keyword over AIC's public
// domain paintings, not from a textbook list: "Cubism" has 3 works there,
// while other well-known movements have none and are not listed. That field
// also holds centuries, cultures, places and dynasties ("19th century",
// "Chinese (culture or style)", "isfahan"); only named art movements,
// schools and styles are kept. Values are matched exactly and are case
// sensitive, which is why "romantic" and "nabis" are lowercase and why
// "Renaissance" (66 works) does not include "northern renaissance" (2).
// Counts are works with that value, as of September 2026, largest first.
const MOVEMENTS = {
  impressionism: 'Impressionism', // 155
  renaissance: 'Renaissance', // 66
  realism: 'Realism', // 58
  postImpressionism: 'Post-Impressionism', // 50
  modernism: 'Modernism', // 44
  baroque: 'Baroque', // 22
  barbizonSchool: 'Barbizon School', // 19
  folkArt: 'Folk Art', // 18
  neoclassicism: 'Neoclassicism', // 11
  japonisme: 'Japanism', // 10
  romanticism: 'romantic', // 9
  mannerism: 'Mannerism', // 8
  gothic: 'Gothic (medieval)', // 5
  ashcanSchool: 'Ashcan School', // 4
  cubism: 'Cubism', // 3
  naturalism: 'Naturalism', // 2
  rococo: 'Rococo', // 2
  preRaphaelite: 'Pre-Raphaelite', // 2
  hudsonRiverSchool: 'Hudson River School', // 2
  northernRenaissance: 'northern renaissance', // 2
  pointillism: 'Pointillism', // 1
  symbolism: 'Symbolism', // 1
  nabis: 'nabis', // 1
  synthetism: 'synthetist', // 1
  classicism: 'classicism', // 1
};

const MOVEMENT_KEYS = Object.keys(MOVEMENTS);

// Sources that can honor a movement filter.
const MOVEMENT_SOURCES = ['aic'];

// The selected movements are alternatives, merged into one exact-match list
// for the source, like the subject categories (see categories.js).
function styleValues(selectedKeys) {
  return [...new Set(selectedKeys.map((key) => MOVEMENTS[key]).filter(Boolean))];
}

// No selection means no movement filter, so every source qualifies. With a
// selection, a source that cannot search by movement is skipped for that
// fetch instead of being fetched unfiltered.
function sourceSupportsMovements(source, selectedKeys) {
  return selectedKeys.length === 0 || MOVEMENT_SOURCES.includes(source);
}

module.exports = { MOVEMENTS, MOVEMENT_KEYS, styleValues, sourceSupportsMovements };
