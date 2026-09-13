(function () {
  const SUPPORTED_LANGUAGES = ['en', 'it'];
  const STORAGE_KEY = 'settingsLanguage';
  const listeners = [];

  function detectLanguage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored;
    const browserLanguage = (navigator.language || 'en').slice(0, 2);
    return SUPPORTED_LANGUAGES.includes(browserLanguage) ? browserLanguage : 'en';
  }

  function applyToDom(strings) {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (strings[key] !== undefined) el.textContent = strings[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (strings[key] !== undefined) el.placeholder = strings[key];
    });
  }

  async function loadLanguage(lang) {
    try {
      const res = await fetch(`/locales/${lang}.json`);
      window.i18n.strings = await res.json();
      window.i18n.language = lang;
      applyToDom(window.i18n.strings);
      listeners.forEach((callback) => callback(window.i18n.strings));
    } catch (err) {
      // Leave whatever text is already on the page (the static English
      // fallback baked into settings.html) rather than break the panel.
      console.error(`Failed to load locale "${lang}": ${err.message}`);
    }
  }

  window.i18n = {
    strings: {},
    language: null,
    onChange(callback) {
      listeners.push(callback);
    },
    setLanguage(lang) {
      localStorage.setItem(STORAGE_KEY, lang);
      return loadLanguage(lang);
    },
  };

  const picker = document.getElementById('language-select');
  const initialLanguage = detectLanguage();
  picker.value = initialLanguage;
  loadLanguage(initialLanguage);
  picker.addEventListener('change', () => window.i18n.setLanguage(picker.value));
})();
