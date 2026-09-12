(function () {
  const form = document.getElementById('settings-form');
  const statusEl = document.getElementById('status');
  const captionModeEl = document.getElementById('captionMode');
  const captionDelayEl = document.getElementById('captionDelaySeconds');

  const SHAPE_BANDS = ['vertical', 'square', 'rectangular', 'panoramic'];
  const shapeAnyEl = document.getElementById('shape-any');
  const shapeBandEls = SHAPE_BANDS.map((band) => document.getElementById('shape-' + band));

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
    document.getElementById('artistFilter').value = settings.artistFilter;
    document.getElementById('regionFilter').value = settings.regionFilter;
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

    return {
      slideIntervalMinutes: Number(document.getElementById('slideIntervalMinutes').value),
      crossfadeSeconds: Number(document.getElementById('crossfadeSeconds').value),
      imageSources,
      shapeFilters,
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
      if (!res.ok) throw new Error(body.error || 'Errore sconosciuto');
      fieldsFromSettings(body);
      showStatus('Impostazioni salvate.', false);
    } catch (err) {
      showStatus(`Errore: ${err.message}`, true);
    }
  });

  fetch('/api/settings')
    .then((r) => r.json())
    .then(fieldsFromSettings)
    .catch((err) => showStatus(`Impossibile caricare le impostazioni: ${err.message}`, true));
})();
