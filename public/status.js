(function () {
  const lastSuccessEl = document.getElementById('status-last-success');
  const eventsEl = document.getElementById('status-events');
  const POLL_INTERVAL_MS = 15000;

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString();
  }

  function render(status) {
    if (status.lastSuccess) {
      const s = status.lastSuccess;
      lastSuccessEl.textContent = `${formatTime(s.timestamp)} - [${s.source}] ${s.message}`;
    } else {
      lastSuccessEl.textContent = window.i18n.strings.noSuccessYetMessage || 'No successful fetch yet.';
    }

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
