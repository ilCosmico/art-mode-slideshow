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
