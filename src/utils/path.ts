import { dirname, relative } from 'node:path/posix';

export function relativePath(from: string, to: string) {
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
  tree: Record<number, Record<number, string>>,
  entry: number
): Record<number, string> {
  const paths = resolveTreePaths(tree, entry);
  paths[entry] = './index.js';

  const entryDepth = Object.values(paths).reduce(
    (acc, path) => Math.max(acc, path.split('..').length),
    0
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
      assert(!newPath.includes('..'));
      return [id, newPath];
    })
  );
}

/**
 * Recursively resolve the paths of a dependency tree.
 */
function resolveTreePaths(
  graph: Record<number, Record<number, string>>,
  entry: number,
  cwd = '.'
) {
  const paths: Record<number, string> = {};
  const entries = Object.entries(graph[entry]) as unknown as [number, string][];

  for (const [id, key] of entries) {
    let path: string;
    if (key.startsWith('.')) {
      path = join(cwd, key);
      if (!path.endsWith('.js')) path += '.js';
    } else {
      path = join('node_modules', key, 'index.js');
    }
    paths[id] = path;
    const newCwd = path.endsWith('.js') ? dirname(path) : path;
    Object.assign(paths, resolveTreePaths(graph, id, newCwd));
  }

  return paths;
}
