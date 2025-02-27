const isMacintosh = navigator.userAgent.includes('Macintosh');
const isIOS =
  (navigator.userAgent.includes('Macintosh') ||
    navigator.userAgent.includes('iPad') ||
    navigator.userAgent.includes('iPhone')) &&
  !!navigator.maxTouchPoints &&
  navigator.maxTouchPoints > 0;

export const ctrlCmdIcon = isMacintosh || isIOS ? '⌘' : 'Ctrl';
