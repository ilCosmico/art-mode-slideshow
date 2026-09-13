const fs = require('fs/promises');
const path = require('path');
const config = require('./config');

const VALID_SOURCES = ['aic', 'met'];
const SHAPE_BANDS = ['vertical', 'square', 'rectangular', 'panoramic'];
const CAPTION_MODES = ['fixed', 'fade'];
const CAPTION_POSITIONS = [
  'top-left', 'top-center', 'top-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

function settingsPath() {
  return path.join(config.dataDir, 'settings.json');
}

function defaults() {
  return {
    slideIntervalMinutes: config.slideIntervalMinutes,
    crossfadeSeconds: config.crossfadeSeconds,
    imageSources: config.imageSources,
    shapeFilters: config.shapeFilters,
    cacheMaxAgeDays: config.cacheMaxAgeDays,
    cacheMaxSizeMb: config.cacheMaxSizeMb,
    artistFilter: '',
    regionFilter: '',
    showCaption: false,
    captionMode: 'fade',
    captionDelaySeconds: 8,
    captionPosition: 'bottom-right',
  };
}

// Field validators: each returns the sanitized value or throws a message
// meant to be shown back to whoever is filling in the settings form.
const VALIDATORS = {
  slideIntervalMinutes: (v) => positiveNumber(v, 'slideIntervalMinutes'),
  crossfadeSeconds: (v) => nonNegativeNumber(v, 'crossfadeSeconds'),
  imageSources: nonEmptyArrayOf(VALID_SOURCES, 'imageSources'),
  shapeFilters: nonEmptyArrayOf(SHAPE_BANDS, 'shapeFilters'),
  // 0 is a valid, if extreme, choice (e.g. "no entry survives past
  // today"), so these accept non-negative, not strictly positive.
  cacheMaxAgeDays: (v) => optionalNonNegativeNumber(v, 'cacheMaxAgeDays'),
  cacheMaxSizeMb: (v) => optionalNonNegativeNumber(v, 'cacheMaxSizeMb'),
  artistFilter: (v) => String(v ?? '').trim(),
  regionFilter: (v) => String(v ?? '').trim(),
  showCaption: (v) => Boolean(v),
  captionMode: (v) => oneOf(v, CAPTION_MODES, 'captionMode'),
  captionDelaySeconds: (v) => positiveNumber(v, 'captionDelaySeconds'),
  captionPosition: (v) => oneOf(v, CAPTION_POSITIONS, 'captionPosition'),
};

function positiveNumber(v, field) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${field} must be a positive number`);
  return n;
}

function nonNegativeNumber(v, field) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${field} must be a non-negative number`);
  return n;
}

// null/undefined means "disabled" - the setting stays opt-in.
function optionalNonNegativeNumber(v, field) {
  if (v === null || v === undefined || v === '') return null;
  return nonNegativeNumber(v, field);
}

function oneOf(v, allowed, field) {
  if (!allowed.includes(v)) throw new Error(`${field} must be one of: ${allowed.join(', ')}`);
  return v;
}

function nonEmptyArrayOf(allowed, field) {
  return (v) => {
    if (!Array.isArray(v) || v.length === 0) throw new Error(`${field} must be a non-empty array`);
    const values = v.map(String);
    const invalid = values.filter((x) => !allowed.includes(x));
    if (invalid.length > 0) throw new Error(`${field} contains unknown values: ${invalid.join(', ')}`);
    return values;
  };
}

// Only used while loading settings.json at startup: unlike the strict
// validators above, a field that fails here is dropped instead of
// blocking the whole app from starting over one bad saved value.
function sanitizeForLoad(saved) {
  const sanitized = {};
  for (const [key, validate] of Object.entries(VALIDATORS)) {
    if (!(key in saved)) continue;
    try {
      sanitized[key] = validate(saved[key]);
    } catch (err) {
      console.error(`Ignoring invalid saved setting "${key}": ${err.message}`);
    }
  }
  return sanitized;
}

let current = defaults();

async function load() {
  try {
    const raw = await fs.readFile(settingsPath(), 'utf8');
    const saved = JSON.parse(raw);
    current = { ...defaults(), ...sanitizeForLoad(saved) };
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`Failed to load settings.json: ${err.message}`);
  }
}

function getAll() {
  return { ...current };
}

async function update(partial) {
  const next = { ...current };
  for (const [key, value] of Object.entries(partial)) {
    const validate = VALIDATORS[key];
    if (!validate) throw new Error(`unknown setting: ${key}`);
    next[key] = validate(value);
  }
  current = next;
  await persist();
  return getAll();
}

async function persist() {
  await fs.mkdir(config.dataDir, { recursive: true });
  await fs.writeFile(settingsPath(), JSON.stringify(current, null, 2));
}

module.exports = { load, getAll, update, VALID_SOURCES, SHAPE_BANDS, CAPTION_MODES, CAPTION_POSITIONS };
