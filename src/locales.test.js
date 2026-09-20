const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

function loadLocale(lang) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'locales', `${lang}.json`), 'utf8'));
}

test('English and Italian locale files define exactly the same keys', () => {
  assert.deepEqual(Object.keys(loadLocale('it')).sort(), Object.keys(loadLocale('en')).sort());
});

test('the sidelined-source message keeps its placeholders in both languages', () => {
  for (const lang of ['en', 'it']) {
    const message = loadLocale(lang).sourceSidelinedMessage;
    assert.match(message, /\{source\}/, lang);
    assert.match(message, /\{time\}/, lang);
  }
});
