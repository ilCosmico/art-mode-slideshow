const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

// This test lives next to the translations/ directory rather than
// inside it on purpose: index.js auto-discovers every .js file in that
// directory as a language dictionary (that's the whole point of the
// mechanism being tested here), so a test file placed inside it would
// itself get picked up as one.
//
// To prove "add a file, no code change needed" is real and not just
// how the mechanism is described, a throwaway language file is written
// into translations/ before requiring the module (module-level lookups
// are only built once, at require time) and removed immediately after.
const THROWAWAY_PATH = path.join(__dirname, 'translations', '__throwaway_test_language.js');
fs.writeFileSync(
  THROWAWAY_PATH,
  'module.exports = { regions: { wonderlandia: \'Wonderland\' }, artists: { testino: \'TestArtist\' } };\n',
);

let translateRegion;
let translateArtist;
try {
  ({ translateRegion, translateArtist } = require('./translations'));
} finally {
  fs.unlinkSync(THROWAWAY_PATH);
}

test('a newly added language file is picked up automatically at load time', () => {
  assert.equal(translateRegion('Wonderlandia'), 'Wonderland');
  assert.equal(translateArtist('Testino'), 'TestArtist');
});

test('known Italian region terms resolve to the English API term', () => {
  assert.equal(translateRegion('Italia'), 'Italy');
  assert.equal(translateRegion('Giappone'), 'Japan');
  assert.equal(translateRegion('Paesi Bassi'), 'Netherlands');
});

test('known Italian artist terms resolve to the anglicized form', () => {
  assert.equal(translateArtist('Raffaello'), 'Raphael');
  assert.equal(translateArtist('Tiziano'), 'Titian');
  assert.equal(translateArtist('Kandinskij'), 'Kandinsky');
});

test('lookup is case-insensitive and tolerates surrounding whitespace', () => {
  assert.equal(translateRegion('ITALIA'), 'Italy');
  assert.equal(translateRegion('  italia  '), 'Italy');
});

test('a term not in any dictionary passes through unchanged', () => {
  assert.equal(translateRegion('Atlantis'), 'Atlantis');
  assert.equal(translateArtist('Rembrandt'), 'Rembrandt');
  assert.equal(translateRegion('Japan'), 'Japan');
});

test('empty or undefined input passes through unchanged', () => {
  assert.equal(translateRegion(''), '');
  assert.equal(translateArtist(undefined), undefined);
});
