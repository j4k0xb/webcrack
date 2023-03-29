import { dirname, relative } from 'node:path/posix';

export function relativePath(from: string, to: string) {
  const relativePath = relative(dirname(from), to);
  return relativePath.startsWith('.') ? relativePath : './' + relativePath;
}
