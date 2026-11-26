(() => {
  const key = 'casa-en-cuenta-appearance-v1';
  const defaults = { theme: 'kolashampan', mode: 'claro' };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
  const prefs = { ...defaults, ...saved };
  const apply = () => {
    document.body.dataset.theme = prefs.theme;
    document.body.dataset.colorMode = prefs.mode;
    const theme = document.getElementById('app-theme');
    const mode = document.getElementById('color-mode');
    if (theme) theme.value = prefs.theme;
    if (mode) mode.value = prefs.mode;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = prefs.mode === 'oscuro' ? '#17191b' : (prefs.theme === 'minimalista' ? '#f3f3f1' : '#d9eef0');
  };
  const save = () => { localStorage.setItem(key, JSON.stringify(prefs)); apply(); };
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('app-theme')?.addEventListener('change', e => { prefs.theme = e.target.value; save(); });
    document.getElementById('color-mode')?.addEventListener('change', e => { prefs.mode = e.target.value; save(); });
  });
})();

