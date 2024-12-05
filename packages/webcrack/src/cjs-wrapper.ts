import type { webcrack as wc } from './index.js';

export const webcrack: typeof wc = async (...args) => {
  const { webcrack } = await import('./index.js');
  return webcrack(...args);
};
