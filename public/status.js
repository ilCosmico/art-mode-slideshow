(function () {
  const lastSuccessEl = document.getElementById('status-last-success');
  const sidelinedEl = document.getElementById('status-sidelined');
  const eventsEl = document.getElementById('status-events');
  const POLL_INTERVAL_MS = 15000;

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString();
  }

  function sourceLabel(source) {
    const key = `source${source.charAt(0).toUpperCase()}${source.slice(1)}Label`;
    return window.i18n.strings[key] || source;
  }

  function render(status) {
    if (status.lastSuccess) {
      const s = status.lastSuccess;
      lastSuccessEl.textContent = `${formatTime(s.timestamp)} - [${s.source}] ${s.message}`;
    } else {
      lastSuccessEl.textContent = window.i18n.strings.noSuccessYetMessage || 'No successful fetch yet.';
    }

    const template = window.i18n.strings.sourceSidelinedMessage
      || '{source} is paused after repeated download failures. It will be retried after {time}.';
    sidelinedEl.innerHTML = '';
    status.sidelinedSources.forEach((entry) => {
      const li = document.createElement('li');
      li.textContent = template
        .replace('{source}', sourceLabel(entry.source))
        .replace('{time}', formatTime(entry.until));
      sidelinedEl.appendChild(li);
    });

    eventsEl.innerHTML = '';
    status.events.forEach((event) => {
      const li = document.createElement('li');
      li.className = event.level;
      li.textContent = `${formatTime(event.timestamp)} [${event.source}] ${event.message}`;
      eventsEl.appendChild(li);
    });
  }

  async function poll() {
    try {
      const res = await fetch('/api/status');
      render(await res.json());
    } catch (err) {
      const prefix = window.i18n.strings.loadStatusErrorPrefix || 'Unable to load status: ';
      lastSuccessEl.textContent = `${prefix}${err.message}`;
    }
  }

  poll();
  setInterval(poll, POLL_INTERVAL_MS);
})();
