(function () {
  const form = document.getElementById('settings-form');
  const statusEl = document.getElementById('status');
  const captionModeEl = document.getElementById('captionMode');
  const captionDelayEl = document.getElementById('captionDelaySeconds');

  function t(key, fallback) {
    return window.i18n.strings[key] || fallback;
  }

  const SHAPE_BANDS = ['vertical', 'square', 'rectangular', 'panoramic'];
  const shapeAnyEl = document.getElementById('shape-any');
  const shapeBandEls = SHAPE_BANDS.map((band) => document.getElementById('shape-' + band));

  // A group of checkboxes whose options come from the server, so adding an
  // entry there is enough; its label is <prefix><Name>Label in the locale
  // files (categoryLandscapeLabel, movementBaroqueLabel, ...).
  function checkboxGroup(containerId, prefix) {
    const container = document.getElementById(containerId);
    let keys = [];

    function renderLabels() {
      keys.forEach((key) => {
        const labelKey = `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}Label`;
        document.querySelector(`label[for="${prefix}-${key}"]`).textContent = t(labelKey, key);
      });
    }

    window.i18n.onChange(renderLabels);

    return {
      build(serverKeys) {
        keys = serverKeys;
        keys.forEach((key) => {
          const row = document.createElement('span');
          row.className = 'checkbox-row';
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.id = `${prefix}-${key}`;
          const label = document.createElement('label');
          label.htmlFor = input.id;
          row.append(input, label);
          container.appendChild(row);
        });
        renderLabels();
      },
      setChecked(selected) {
        keys.forEach((key) => { document.getElementById(`${prefix}-${key}`).checked = selected.includes(key); });
      },
      getChecked() {
        return keys.filter((key) => document.getElementById(`${prefix}-${key}`).checked);
      },
    };
  }

  const categoryGroup = checkboxGroup('categories', 'category');
  const movementGroup = checkboxGroup('movements', 'movement');

  function updateShapeAnyState() {
    shapeAnyEl.checked = shapeBandEls.every((el) => el.checked);
  }

  function fieldsFromSettings(settings) {
    document.getElementById('slideIntervalMinutes').value = settings.slideIntervalMinutes;
    document.getElementById('crossfadeSeconds').value = settings.crossfadeSeconds;
    document.getElementById('source-aic').checked = settings.imageSources.includes('aic');
    document.getElementById('source-met').checked = settings.imageSources.includes('met');
    SHAPE_BANDS.forEach((band, i) => { shapeBandEls[i].checked = settings.shapeFilters.includes(band); });
    updateShapeAnyState();
    categoryGroup.setChecked(settings.categories);
    movementGroup.setChecked(settings.movements);
    document.getElementById('artistFilter').value = settings.artistFilter;
    document.getElementById('regionFilter').value = settings.regionFilter;
    document.getElementById('cacheMaxAgeDays').value = settings.cacheMaxAgeDays ?? '';
    document.getElementById('cacheMaxSizeMb').value = settings.cacheMaxSizeMb ?? '';
    document.getElementById('showCaption').checked = settings.showCaption;
    captionModeEl.value = settings.captionMode;
    captionDelayEl.value = settings.captionDelaySeconds;
    document.getElementById('captionPosition').value = settings.captionPosition;
    updateCaptionDelayState();
  }

  function settingsFromFields() {
    const imageSources = [];
    if (document.getElementById('source-aic').checked) imageSources.push('aic');
    if (document.getElementById('source-met').checked) imageSources.push('met');

    const shapeFilters = SHAPE_BANDS.filter((band, i) => shapeBandEls[i].checked);

    const cacheMaxAgeDaysValue = document.getElementById('cacheMaxAgeDays').value;
    const cacheMaxSizeMbValue = document.getElementById('cacheMaxSizeMb').value;

    return {
      slideIntervalMinutes: Number(document.getElementById('slideIntervalMinutes').value),
      crossfadeSeconds: Number(document.getElementById('crossfadeSeconds').value),
      imageSources,
      shapeFilters,
      categories: categoryGroup.getChecked(),
      movements: movementGroup.getChecked(),
      cacheMaxAgeDays: cacheMaxAgeDaysValue === '' ? null : Number(cacheMaxAgeDaysValue),
      cacheMaxSizeMb: cacheMaxSizeMbValue === '' ? null : Number(cacheMaxSizeMbValue),
      artistFilter: document.getElementById('artistFilter').value,
      regionFilter: document.getElementById('regionFilter').value,
      showCaption: document.getElementById('showCaption').checked,
      captionMode: captionModeEl.value,
      captionDelaySeconds: Number(captionDelayEl.value),
      captionPosition: document.getElementById('captionPosition').value,
    };
  }

  function updateCaptionDelayState() {
    captionDelayEl.disabled = captionModeEl.value !== 'fade';
  }

  shapeAnyEl.addEventListener('change', () => {
    shapeBandEls.forEach((el) => { el.checked = shapeAnyEl.checked; });
  });
  shapeBandEls.forEach((el) => el.addEventListener('change', updateShapeAnyState));

  function showStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.className = isError ? 'error' : 'ok';
  }

  captionModeEl.addEventListener('change', updateCaptionDelayState);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsFromFields()),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || t('unknownErrorMessage', 'Unknown error'));
      fieldsFromSettings(body);
      showStatus(t('settingsSavedMessage', 'Settings saved.'), false);
    } catch (err) {
      showStatus(`${t('errorPrefix', 'Error: ')}${err.message}`, true);
    }
  });

  Promise.all([
    fetch('/api/categories').then((r) => r.json()),
    fetch('/api/movements').then((r) => r.json()),
    fetch('/api/settings').then((r) => r.json()),
  ])
    .then(([categoryKeys, movementKeys, settings]) => {
      categoryGroup.build(categoryKeys);
      movementGroup.build(movementKeys);
      fieldsFromSettings(settings);
    })
    .catch((err) => showStatus(`${t('loadSettingsErrorPrefix', 'Unable to load settings: ')}${err.message}`, true));
})();
