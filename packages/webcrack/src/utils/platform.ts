export function isBrowser(): boolean {
  return typeof window !== "undefined" || typeof importScripts !== "undefined";
}
