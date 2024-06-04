import { createEffect, createRoot, createSignal } from 'solid-js';
import { settings } from './useSettings';

const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
const [preferredTheme, setPreferredTheme] = createSignal(
  darkMediaQuery.matches ? 'dark' : 'light',
);

export function theme() {
  return settings.theme === 'system' ? preferredTheme() : settings.theme;
}

createRoot(() => {
  createEffect(() => {
    document.documentElement.dataset.theme = theme();
  });

  darkMediaQuery.addEventListener('change', (event) => {
    setPreferredTheme(event.matches ? 'dark' : 'light');
  });
});
