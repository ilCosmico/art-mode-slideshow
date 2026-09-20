const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeArtist, normalizeAicArtist } = require('./artistName');

test('empty, null, or undefined input returns empty string', () => {
  assert.equal(normalizeArtist(''), '');
  assert.equal(normalizeArtist(null), '');
  assert.equal(normalizeArtist(undefined), '');
});

test('known unknown-artist phrases, verified live from AIC and Met, resolve to empty', () => {
  // AIC
  assert.equal(normalizeArtist('Artist Unknown\nChinese'), '');
  assert.equal(normalizeArtist('Artist unknown (American, 18th century)'), '');
  assert.equal(normalizeArtist('Unidentified artist\nJapanese, active 19th century'), '');
  assert.equal(normalizeArtist('Anonymous\nJapanese'), '');
  // Met
  assert.equal(normalizeArtist('Unidentified artist'), '');
  assert.equal(normalizeArtist('Unknown'), '');
  assert.equal(normalizeArtist('Unknown Artist'), '');
  assert.equal(normalizeArtist('Anonymous, Czech, early 20th century'), '');
});

test('matching is case-insensitive', () => {
  assert.equal(normalizeArtist('UNKNOWN'), '');
  assert.equal(normalizeArtist('anonymous'), '');
});

test('known real artist names pass through unchanged', () => {
  assert.equal(normalizeArtist('Claude Monet (French, 1840-1926)'), 'Claude Monet (French, 1840-1926)');
  assert.equal(normalizeArtist('Rembrandt (Rembrandt van Rijn)'), 'Rembrandt (Rembrandt van Rijn)');
});

test('only the first line is kept: the biography line AIC adds is dropped', () => {
  // Real AIC artist_display values (verified live): a second line carries
  // birth and death details, which must not end up in the caption.
  assert.equal(
    normalizeArtist('Wassily Kandinsky\nBorn Moscow (formerly Russian Empire, now Russia), 1866; died Neuilly-sur-Seine, France, 1944'),
    'Wassily Kandinsky',
  );
  assert.equal(normalizeArtist('Georges Seurat\r\nFrench, 1859-1891'), 'Georges Seurat');
});

test('a single-line credit keeps its parenthetical details', () => {
  assert.equal(normalizeArtist('Georges Seurat (French, 1859-1891)'), 'Georges Seurat (French, 1859-1891)');
});

test('a real artist whose chosen credit contains "Anonymous" is not stripped', () => {
  // Real AIC catalog entry: Bruce Conner titled a work "Anonymous" - the
  // artist is identified, just not by a straightforward name.
  assert.equal(normalizeArtist('"Anonymous" (Bruce Conner)'), '"Anonymous" (Bruce Conner)');
  assert.equal(normalizeArtist('Anonymous Fermilab Photographer'), 'Anonymous Fermilab Photographer');
});

test('AIC: artist_title is used, without the nationality and dates of artist_display', () => {
  // Real AIC records, verified live.
  assert.equal(
    normalizeAicArtist({ artist_title: 'Claude Monet', artist_display: 'Claude Monet (French, 1840-1926)' }),
    'Claude Monet',
  );
  assert.equal(
    normalizeAicArtist({
      artist_title: 'Vasily Kandinsky',
      artist_display: 'Vasily Kandinsky\nBorn Moscow (formerly Russian Empire, now Russia), 1866; died Neuilly-sur-Seine, France, 1944',
    }),
    'Vasily Kandinsky',
  );
});

test("AIC: artist_title is kept as AIC's own canonical spelling, even when it differs from artist_display", () => {
  assert.equal(
    normalizeAicArtist({ artist_title: 'Hilaire Germain Edgar Degas', artist_display: 'Edgar Degas (French, 1834-1917)' }),
    'Hilaire Germain Edgar Degas',
  );
});

test('AIC: an empty or missing artist_title means no artist', () => {
  // Culture-only records, verified live: artist_display holds a place, not a name.
  assert.equal(normalizeAicArtist({ artist_title: '', artist_display: 'India' }), '');
  assert.equal(normalizeAicArtist({ artist_title: null, artist_display: 'Iran\nShiraz, Fars' }), '');
  assert.equal(normalizeAicArtist({ artist_display: 'Central Ethiopia\nEastern and Southern Africa' }), '');
  assert.equal(normalizeAicArtist({}), '');
});

test('AIC: an unknown-artist artist_display wins over a culture label in artist_title', () => {
  // Real AIC records: artist_title holds "French School" / "Italian" here.
  assert.equal(
    normalizeAicArtist({ artist_title: 'French School', artist_display: 'Artist unknown (French, active 18th century)' }),
    '',
  );
  assert.equal(
    normalizeAicArtist({ artist_title: 'Italian', artist_display: 'Artist unknown (Italian, active 18th century)' }),
    '',
  );
  assert.equal(normalizeAicArtist({ artist_title: '', artist_display: 'Artist Unknown\nJapanese' }), '');
});

test('AIC: surrounding whitespace in artist_title is trimmed', () => {
  assert.equal(normalizeAicArtist({ artist_title: '  Claude Monet ', artist_display: 'Claude Monet (French)' }), 'Claude Monet');
});
