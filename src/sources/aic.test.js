const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSearchBody, buildImageUrl } = require('./aic');

// The must clauses of the search body, and the terms of the one that matches
// on a given field (undefined when there is none).
function clauses(filters) {
  return buildSearchBody(1, filters).query.bool.must;
}

function termsOn(filters, field) {
  return clauses(filters).find((clause) => clause.terms?.[field])?.terms[field];
}

test('without subject terms there is no subject clause', () => {
  assert.equal(termsOn({ artistFilter: '', regionFilter: '' }, 'subject_titles.keyword'), undefined);
});

test('subject terms become one exact "terms" clause on the keyword field', () => {
  assert.deepEqual(termsOn({ subjectTerms: ['landscapes', 'landscape'] }, 'subject_titles.keyword'), ['landscapes', 'landscape']);
});

test('a single-value clause stays a plain match, so artist and region are unchanged', () => {
  const must = clauses({ artistFilter: 'Monet', regionFilter: 'France', subjectTerms: ['war'] });
  assert.deepEqual(must[1], { match: { artist_title: 'Monet' } });
  assert.deepEqual(must[2], { match: { place_of_origin: 'France' } });
});

test('the subject clause sits alongside the artist clause, so both must match', () => {
  // painting type, artist, subject, public domain
  assert.equal(clauses({ artistFilter: 'Monet', subjectTerms: ['portraits'] }).length, 4);
});

test('without style terms there is no style clause', () => {
  assert.equal(termsOn({ subjectTerms: ['war'] }, 'style_titles.keyword'), undefined);
});

test('style terms become one exact "terms" clause on style_titles.keyword', () => {
  assert.deepEqual(termsOn({ styleTerms: ['Impressionism', 'Realism'] }, 'style_titles.keyword'), ['Impressionism', 'Realism']);
});

test('a style clause never leaks a text match on the movement: Impressionism does not become a word search', () => {
  const must = clauses({ styleTerms: ['Impressionism'] });
  assert.equal(must.some((clause) => clause.match && Object.keys(clause.match).some((k) => k.startsWith('style_title'))), false);
});

test('subject, style and artist clauses all sit in the same query, so all must match', () => {
  // painting type, artist, subject, style, public domain
  assert.equal(clauses({ artistFilter: 'Monet', subjectTerms: ['landscapes'], styleTerms: ['Impressionism'] }).length, 5);
});

test('the page, the page size and the fields travel in the body', () => {
  const body = buildSearchBody(3, {});
  assert.equal(body.page, 3);
  assert.equal(body.limit, 100);
  assert.ok(body.fields.split(',').includes('image_id'));
});

test('a long list of subject terms stays in the body, out of any URL', () => {
  // AIC refuses a GET URL past about 2000 characters (22 terms already do).
  const subjectTerms = Array.from({ length: 200 }, (_, i) => `subject number ${i}`);
  assert.deepEqual(termsOn({ subjectTerms }, 'subject_titles.keyword'), subjectTerms);
});

test('an image wider than the maximum is requested at 1686 px, exactly as before', () => {
  const url = buildImageUrl({ image_id: 'abc-123', thumbnail: { width: 5417, height: 17274 } });
  assert.equal(url, 'https://www.artic.edu/iiif/2/abc-123/full/1686,/0/default.jpg');
});

test('an image exactly 1686 px wide is still requested at 1686 px', () => {
  assert.ok(buildImageUrl({ image_id: 'abc-123', thumbnail: { width: 1686, height: 2250 } }).includes('/full/1686,/'));
});

test('an image narrower than 1686 px is requested at its own width, never scaled up', () => {
  // Real AIC records, verified live: these widths are served at the original size.
  assert.ok(buildImageUrl({ image_id: 'a', thumbnail: { width: 1663, height: 2250 } }).includes('/full/1663,/'));
  assert.ok(buildImageUrl({ image_id: 'b', thumbnail: { width: 1328, height: 866 } }).includes('/full/1328,/'));
});

test('the requested width never exceeds the original width', () => {
  for (const width of [1, 800, 1685, 1686, 1687, 4000]) {
    const requested = Number(buildImageUrl({ image_id: 'x', thumbnail: { width, height: 100 } }).match(/\/full\/(\d+),\//)[1]);
    assert.ok(requested <= width && requested <= 1686, `width ${width} requested ${requested}`);
  }
});
