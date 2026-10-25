/* University Assistant — static site theme: light by default, persisted in localStorage. */
(() => {
  'use strict';

  const KEY = 'ua-site-theme';
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const buttons = document.querySelectorAll('[data-theme-toggle]');

  function storedTheme() {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }

  function paint(dark) {
    if (dark) root.dataset.theme = 'dark';
    else delete root.dataset.theme;
    if (themeColor) themeColor.setAttribute('content', dark ? '#0e1116' : '#004191');
    buttons.forEach((button) => {
      button.setAttribute('aria-pressed', String(dark));
    });
  }

  paint(storedTheme() === 'dark');

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const dark = root.dataset.theme !== 'dark';
      paint(dark);
      try {
        localStorage.setItem(KEY, dark ? 'dark' : 'light');
      } catch {
        /* private mode */
      }
    });
  });
})();
