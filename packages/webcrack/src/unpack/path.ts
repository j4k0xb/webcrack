import { posix } from 'node:path';

// eslint-disable-next-line @typescript-eslint/unbound-method
const { dirname, join, relative } = posix;

export function relativePath(from: string, to: string): string {
  if (to.startsWith('node_modules/')) return to.replace('node_modules/', '');
  const relativePath = relative(dirname(from), to);
  return relativePath.startsWith('.') ? relativePath : './' + relativePath;
}

/**
 * Resolve the path of each module of a browserify bundle
 * based on its dependencies.
 * @param tree module id -> dependencies (id -> path)
 * @param entry entry module id
 */
export function resolveDependencyTree(
  tree: Record<string, Record<string, string>>,
  entry: string,
): Record<string, string> {
  const paths = resolveTreePaths(tree, entry);
  paths[entry] = './index.js';

  const entryDepth = Object.values(paths).reduce(
    (acc, path) => Math.max(acc, path.split('..').length),
    0,
  );
  // If the entrypoint is in a subfolder, we need to make up a prefix to get rid of the `../`
  const prefix = Array(entryDepth - 1)
    .fill(0)
    .map((_, i) => `tmp${i}`)
    .join('/');

  return Object.fromEntries(
    Object.entries(paths).map(([id, path]) => {
      const newPath = path.startsWith('node_modules/')
        ? path
        : join(prefix, path);
      return [id, newPath];
    }),
  );
}

/**
 * Recursively resolve the paths of a dependency tree.
 */
function resolveTreePaths(
  graph: Record<string, Record<string, string>>,
  entry: string,
  cwd = '.',
  paths: Record<string, string> = {},
) {
  const entries = Object.entries(graph[entry]);

  for (const [id, name] of entries) {
    const isCircular = Object.hasOwn(paths, id);
    if (isCircular) continue;

    let path: string;
    if (name.startsWith('.')) {
      path = join(cwd, name);
      if (!path.endsWith('.js')) path += '.js';
    } else {
      path = join('node_modules', name, 'index.js');
    }
    paths[id] = path;

    const newCwd = path.endsWith('.js') ? dirname(path) : path;
    resolveTreePaths(graph, id, newCwd, paths);
  }

  return paths;
}
