import { createEffect, createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';

const defaultSettings = {
  theme: 'system' as 'dark' | 'light' | 'system',
  confirmOnLeave: true,
  workspaceHistory: true,
  stickyScroll: true,
  wordWrap: true,
};

export type Settings = typeof defaultSettings;

const savedSettings = JSON.parse(
  localStorage.getItem('settings') ?? '{}',
) as Settings;

const [settings, setSettings] = createStore({
  ...defaultSettings,
  ...savedSettings,
});

createRoot(() => {
  createEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  });
});

export { setSettings, settings };
