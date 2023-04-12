import { dirname, relative } from 'node:path';

export function relativePath(from: string, to: string) {
  const relativePath = relative(dirname(from), to);
  return relativePath.startsWith('.') ? relativePath : './' + relativePath;
}
