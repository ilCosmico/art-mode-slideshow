const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { CATEGORY_KEYS } = require('./sources/categories');
const { MOVEMENT_KEYS } = require('./sources/movements');

function loadLocale(lang) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'locales', `${lang}.json`), 'utf8'));
}

test('English and Italian locale files define exactly the same keys', () => {
  assert.deepEqual(Object.keys(loadLocale('it')).sort(), Object.keys(loadLocale('en')).sort());
});

test('every subject category has a label in both languages', () => {
  for (const lang of ['en', 'it']) {
    const locale = loadLocale(lang);
    for (const key of CATEGORY_KEYS) {
      const labelKey = `category${key.charAt(0).toUpperCase()}${key.slice(1)}Label`;
      assert.ok(locale[labelKey], `${lang} is missing ${labelKey}`);
    }
  }
});

test('every art movement has a label in both languages', () => {
  for (const lang of ['en', 'it']) {
    const locale = loadLocale(lang);
    for (const key of MOVEMENT_KEYS) {
      const labelKey = `movement${key.charAt(0).toUpperCase()}${key.slice(1)}Label`;
      assert.ok(locale[labelKey], `${lang} is missing ${labelKey}`);
    }
  }
});

test('the sidelined-source message keeps its placeholders in both languages', () => {
  for (const lang of ['en', 'it']) {
    const message = loadLocale(lang).sourceSidelinedMessage;
    assert.match(message, /\{source\}/, lang);
    assert.match(message, /\{time\}/, lang);
  }
});
