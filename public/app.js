(async function () {
  const layers = [document.getElementById('layer-a'), document.getElementById('layer-b')];
  const captionEl = document.getElementById('caption');
  const CAPTION_POSITIONS = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];

  let activeIndex = 0;
  let captionFadeTimer = null;

  function updateCaption(artwork, cfg) {
    clearTimeout(captionFadeTimer);
    captionFadeTimer = null;

    if (!cfg.showCaption) {
      captionEl.classList.remove('visible');
      return;
    }

    captionEl.textContent = [artwork.artist, artwork.title].filter(Boolean).join(' — ');
    captionEl.classList.remove(...CAPTION_POSITIONS);
    captionEl.classList.add(cfg.captionPosition);
    captionEl.classList.add('visible');

    if (cfg.captionMode === 'fade') {
      captionFadeTimer = setTimeout(() => {
        captionEl.classList.remove('visible');
      }, cfg.captionDelaySeconds * 1000);
    }
  }

  async function showNext(cfg) {
    let artwork;
    try {
      artwork = await fetch('/api/next').then((r) => r.json());
    } catch (err) {
      console.error('Failed to fetch next artwork', err);
      return;
    }
    if (!artwork || !artwork.url) return;

    const nextIndex = 1 - activeIndex;
    const nextLayer = layers[nextIndex];
    const currentLayer = layers[activeIndex];

    nextLayer.style.backgroundImage = `url("${artwork.url}")`;
    nextLayer.classList.add('visible');
    currentLayer.classList.remove('visible');
    activeIndex = nextIndex;

    updateCaption(artwork, cfg);
  }

  // Re-fetched every cycle (not just once at startup) so changes made in
  // the /settings panel reach this page without a manual reload - they
  // take effect starting the next cycle.
  async function tick() {
    let cfg;
    try {
      cfg = await fetch('/api/config').then((r) => r.json());
    } catch (err) {
      console.error('Failed to fetch config', err);
      setTimeout(tick, 60 * 1000);
      return;
    }

    document.documentElement.style.setProperty('--crossfade-seconds', `${cfg.crossfadeSeconds}s`);
    await showNext(cfg);
    setTimeout(tick, cfg.slideIntervalMinutes * 60 * 1000);
  }

  tick();
})();
