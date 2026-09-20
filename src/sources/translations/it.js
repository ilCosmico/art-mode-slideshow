// Verified live against both AIC and Met before being added (an Italian
// term returning 0 results where the English one returns real hits).
// Deliberately not exhaustive - covers what's plausible for museum
// collections, grows over time as needed.
module.exports = {
  regions: {
    italia: 'Italy',
    'paesi bassi': 'Netherlands',
    giappone: 'Japan',
    grecia: 'Greece',
    fiandre: 'Flanders',
    francia: 'France',
    germania: 'Germany',
    spagna: 'Spain',
    egitto: 'Egypt',
    cina: 'China',
    inghilterra: 'England',
    belgio: 'Belgium',
    portogallo: 'Portugal',
    svizzera: 'Switzerland',
  },
  // Most artist names are identical in Italian and English (Rembrandt,
  // Vermeer, Monet...); this only covers the handful of well-known
  // masters with a different anglicized form.
  artists: {
    raffaello: 'Raphael',
    tiziano: 'Titian',
    kandinskij: 'Kandinsky',
  },
};
