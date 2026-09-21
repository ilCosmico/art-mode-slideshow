// App-level subject categories, each mapped to the terms a source uses for
// it. Adding a category means adding one entry here plus its label in
// public/locales/en.json and it.json (category<Name>Label): the settings
// page builds its checkboxes from this list, nothing else changes.
//
// Terms are matched exactly, which is why a category can list several: the
// sources' own vocabularies split one theme across near-duplicates (AIC has
// both "landscapes" and "landscape" as separate subjects). A source with no
// entry for a category is skipped when that category is selected, instead of
// being fetched unfiltered. Terms below were checked live against public
// domain paintings; the counts are in the pull request that added them.
//
// The first five categories were sized by sampling. The other nine (animals
// to mythology) come from each museum's complete vocabulary, chosen term by
// term, because grouping terms by keyword picks up wrong ones (dragons under
// animals, a Buddhist figure under mythology). To refresh them:
//
// AIC: aggregating subject_titles.keyword over public domain paintings (2196
// works, 960 distinct values in September 2026) lists every value with its
// count in one request. Values are case sensitive, and the museum's own
// typos are real values ("architechture" has 48 works).
//
// Met: the API cannot list tags, but the museum's open access catalog
// (MetObjects.csv in the metmuseum/openaccess repository, about 317 MB, read
// once offline and not kept here) has a Tags column, with the tags of a work
// separated by "|". Keeping the rows that are public domain and classified
// exactly "Paintings", which is what fetchRandomArtwork() accepts, leaves
// 5286 works and 663 distinct tags. The counts below are distinct works, not
// tag hits. The API's own search counts are inflated: its hits include works
// flagged not public domain and works not classified as Paintings, which the
// object check then rejects ("Landscapes": 1395 from the search, 738 real;
// over all the tags below, 1952 of 4133 distinct hits are eligible). The
// search also matches a single word loosely: "Fish" returns the works tagged
// "Fishing", "Drinking" those tagged "Drinking Glasses". Measured live, the
// eligible works returned for each category's tags carry one of them at
// least 96 percent of the time (everyday life 96.4, animals 98.5, the rest
// 98 to 100). "Fishing" is out because only 17 of the 67 it returns carry it.
//
// Each Met tag costs one search per fetch (kept for a few hours, see
// searchCache.js), so a category lists at most 16 tags: the ones that add the
// most works, plus any tag named after the category. Tags with fewer than 3
// works are left out unless they carry the category's name. A Met tag says
// that something is depicted, not that it is the subject: "Horses" includes
// battles and riders, "Birds" a crane in the corner of a landscape. AIC has
// no such cost, so its lists keep every clear value, singletons included.
//
// Pool sizes (public domain paintings, as of September 2026), AIC / Met:
//   animals 282 / 1018, flowers 103 / 267, children 189 / 259,
//   interiors 134 / 116, nudes 54 / 85, sea and boats 91 / 219,
//   architecture 253 / 226, everyday life 205 / 106, mythology 60 / 56.
// Mythology, nudes and flowers on AIC are small pools that repeat a lot.
//
// Left out, on purpose:
// - animals: AIC dragons, mermaids, monsters (mythical), snakes, serpents and
//   lizards (Eve, Saint George, Hercules), feathers and wings (hat plumes,
//   angels), hunters and hunting (the people), meat, whale, ram (Abraham's
//   sacrifice). Met Snakes, Dragons, Mythical Creatures, Phoenix, Griffins
//   (mostly Asian Art icons and folios). About 200 Met works sit in the tail
//   of smaller tags (Tigers, Donkeys, Rabbits, Geese, Doves, Ducks, ...).
//   Met "Fish" stays although its search also returns 15 or so "Fishing"
//   works (1.5 percent of the category), because 44 works only carry it.
// - flowers: AIC foliage (111, trees and leaves), plants, garden, flora,
//   floral motifs and patterns, and floral (a dress print). Met Bamboo (68),
//   Trees, Plants, Leaves, Vines, and Lotuses (6 of 16 are Buddhist icons).
// - children: AIC babies, woman with children, mother and child and Virgin
//   and child (over half of them are the Christ Child), youth, sons,
//   daughters, families. AIC "children" itself is 52 of 167 religious works,
//   which an exact match cannot separate. Met Nursing (20 of 21 are Madonna
//   and Child), Family, Mothers, Toys, Dolls.
// - interiors: AIC table, chair, window, wall, bed, furniture (objects that
//   appear in portraits); "domestic scenes" is under everyday life. Met Beds
//   (Annunciations, Asian folios), Tables, Chairs, Windows, Doorways.
// - nudes: AIC bathers and bathing (not always nude), beauty, female. Met
//   Bathing, Skeletons.
// - sea and boats: AIC water (192, all of it), river, rivers, lake, boatman
//   (river boats), fishing, reflections, island, lagoons. Met Rivers (108),
//   Lakes, Canals (inland landscapes), Fishing, Windmills, Storms, Admirals.
// - architecture: AIC bridges, doors, gates, walls, column, exterior,
//   structure, mosaic, stained glass, landscape architecture (gardens). Met
//   Bridges (44, mostly landscapes), Fountains, Tombs, Balconies, Arches,
//   Gates, Columns, Doors, Streets (under everyday life).
// - everyday life: AIC sleep (sleeping mythological figures), countryside,
//   farm, field (landscapes), festivals, reading and dining (Holy Families,
//   still lifes), tea, sports. Met Fishing (the search brings back every work
//   tagged Fish), Servants, Musicians, Dancing, Hunting, Reading, Writing,
//   Sleeping, Family, Dining, Washing, Playing (court and sacred scenes,
//   saints), Wrestling.
// - mythology: AIC "gods (deities)" (Egyptian, Jain, a Christian icon), Roman,
//   Greek and classical (battles, history), cherubs, putti and heaven
//   (Christian), witches, dragons, monsters, mermaids, "mysteries/fantasies"
//   (Gauguin's Tahiti). Met Deities, Goddess, Gods, Krishna, Radha, Shiva,
//   Vishnu, Durga (Hindu and Buddhist icons, which are religion, and
//   Asian Art), Mythical Creatures (9 of 10 Asian), Dragons, Demons, Devil,
//   Hell, Putti (mixed with saints), Allegory, Saint George. Met tags of two
//   works each (Muses, Orpheus, Aeneas, Mercury, Neptune, Argonauts) add
//   about 8 works and are not listed.
const CATEGORIES = {
  landscape: {
    aic: ['landscapes', 'landscape'],
    met: ['Landscapes'],
  },
  portrait: {
    aic: ['portraits', 'portrait'],
    met: ['Portraits'],
  },
  stillLife: {
    aic: ['still life'],
    met: ['Still Life'],
  },
  religious: {
    aic: ['religion', 'Christian subjects', 'saints', 'biblical', 'angels', 'crucifixions'],
    met: ['Saints', 'Christ', 'Virgin Mary', 'Madonna', 'Angels', 'Crucifixion', 'Jesus'],
  },
  war: {
    aic: ['war', 'battles'],
    met: ['War', 'Battle'],
  },
  animals: {
    aic: [
      'animals', 'horses', 'horse', 'dog', 'dogs', 'birds', 'bird', 'cows', 'cattle', 'calfs',
      'sheep', 'goats', 'cats', 'donkeys', 'doves', 'deer', 'deers', 'fish', 'goldfish', 'lions',
      'rabbits', 'ducks', 'elephants', 'Chicken', 'roosters', 'peacocks', 'eagles', 'butterflies',
      'insects', 'monkeys', 'oxen', 'bull', 'pigs', 'swans', 'geese', 'bears', 'boars', 'leopards',
      'cheetahs', 'livestock', 'pets', 'turtle', 'cranes', 'falcons', 'parrots', 'fowl', 'eels',
    ],
    met: [
      'Horses', 'Birds', 'Dogs', 'Cows', 'Fish', 'Elephants', 'Animals', 'Lions', 'Deer', 'Monkeys',
      'Cranes', 'Sheep', 'Cats', 'Peacocks', 'Insects', 'Roosters',
    ],
  },
  flowers: {
    aic: [
      'flowers', 'roses', 'peonies', 'tulips', 'Poppies', 'lilies', 'irises', 'water lilies',
      'Nymphaea', 'daisies', 'carnations', 'chrysanthemums', 'daffodils', 'Geraniums',
    ],
    met: ['Flowers', 'Peonies', 'Roses', 'Orchids', 'Poppies', 'Lilies'],
  },
  children: {
    aic: ['children', 'child', 'boys', 'girls', 'girl', 'portraits: child subject', 'toys', 'toy', 'dolls'],
    met: ['Boys', 'Girls', 'Children', 'Infants'],
  },
  interiors: {
    aic: ['interior', 'interiors', 'bedrooms', 'kitchen', 'fireplaces'],
    met: ['Interiors', 'Bedrooms', 'Kitchens'],
  },
  nudes: {
    aic: ['nudes', 'nudity'],
    met: ['Female Nudes', 'Male Nudes'],
  },
  seaAndBoats: {
    aic: [
      'boats', 'ships', 'sailing', 'sails', 'seascapes', 'ocean', 'oceans', 'sea', 'seas', 'waves',
      'coastal scenes', 'coasts', 'beach', 'beaches', 'harbors', 'port', 'sailors', 'shipwrecks',
      'wreckage',
    ],
    met: ['Boats', 'Ships', 'Seascapes', 'Waves', 'Beaches', 'Seas'],
  },
  architecture: {
    aic: [
      'architecture', 'architechture', 'architectural', 'architectural detail',
      'architectural details', 'architechtural drawing', 'building', 'buildings', 'church',
      'churches', 'cathedrals', 'chapel', 'castles', 'fortresses', 'palace', 'temple', 'tower',
      'towers', 'ruins', 'monumental structures', 'monuments', 'cityscapes', 'townscapes', 'towns',
      'cities', 'city', 'city scenes', 'house', 'houses', 'homes', 'village', 'villa', 'dome',
      'synagogue', 'baptistry', 'courthouse', 'train station', 'factory', 'barns', 'mills',
      'windmill',
    ],
    met: [
      'Buildings', 'Houses', 'Pavilions', 'Cities', 'Palaces', 'Churches', 'Towns', 'Villages',
      'Temples', 'Ruins', 'Towers', 'Stupas', 'Castles', 'Architecture',
    ],
  },
  everydayLife: {
    aic: [
      'everyday life (genre)', 'rural life', 'urban life', 'daily life', 'domestic scenes',
      'farm life', 'genre', 'genre painting', 'modern life', 'American life', 'peasants', 'taverns',
      'labor', 'work', 'working', 'leisure', 'farming', 'farmers', 'agriculture', 'Market', 'Picnic',
      'drinking', 'sewing', 'cooking', 'smoking', 'coffee', 'Breakfast', 'domestic', 'household',
      'street',
    ],
    met: [
      'Working', 'Smoking', 'Games', 'Drinking', 'Farms', 'Streets', 'Markets', 'Skating',
      'Genre Scene', 'Sewing', 'Knitting', 'Daily Life',
    ],
  },
  mythology: {
    aic: [
      'mythology', 'mythological figures', 'mythical', 'Greek mythology', 'goddesses', 'Greek gods',
      'zeus', 'Athena', 'Heracles', 'Aphrodite', 'Venus', 'cupids', 'satyr', 'diana', 'Neptune',
      'mercury',
    ],
    met: [
      'Cupid', 'Venus', 'Nymphs', 'Diana', 'Apollo', 'Bacchus', 'Satyrs', 'Centaurs', 'Jupiter',
      'Narcissus', 'Mythology',
    ],
  },
};

const CATEGORY_KEYS = Object.keys(CATEGORIES);

// The selected categories together are "one or the other": their terms are
// merged into one list per source, and the source searches for any of them.
// An artwork is therefore as likely as any other in the union, so a large
// category comes up more often than a small one (see the pull request).
function termsForSource(source, selectedKeys) {
  const terms = [];
  for (const key of selectedKeys) {
    for (const term of CATEGORIES[key]?.[source] || []) {
      if (!terms.includes(term)) terms.push(term);
    }
  }
  return terms;
}

// No selection means no subject filter, so every source qualifies.
function sourceSupports(source, selectedKeys) {
  return selectedKeys.length === 0 || termsForSource(source, selectedKeys).length > 0;
}

module.exports = { CATEGORIES, CATEGORY_KEYS, termsForSource, sourceSupports };
