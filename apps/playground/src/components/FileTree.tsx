import { For, Show } from "solid-js";
import DirectoryNode from "./DirectoryNode";
import FileNode from "./FileNode";

export interface TreeNode {
  path: string;
  name: string;
  isDirectory: boolean;
  children: TreeNode[];
}

interface Props {
  paths: string[];
  onFileClick?: (node: TreeNode) => void;
}

export default function FileTree(props: Props) {
  const items = () => generateTreeNodes(props.paths);

  return (
    <ul class="menu menu-xs flex-nowrap bg-base-200 rounded-lg w-full overflow-y-auto">
      <For each={items()}>
        {(node) => (
          <Show
            when={node.isDirectory}
            fallback={
              <FileNode onClick={() => props.onFileClick?.(node)} {...node} />
            }
          >
            <DirectoryNode
              onFileClick={(node) => props.onFileClick?.(node)}
              {...node}
            />
          </Show>
        )}
      </For>
    </ul>
  );
}

function generateTreeNodes(paths: string[]): TreeNode[] {
  const tree: TreeNode[] = [];
  const treeCache = new Map<string, TreeNode>();

  sortPathsTokens(paths).forEach((tokens) => {
    let currentLevel = tree;

    tokens.forEach((token, i) => {
      const existingPath = treeCache.get(token);

      if (existingPath) {
        currentLevel = existingPath.children;
      } else {
        const subtree: TreeNode = {
          name: token,
          path: tokens.slice(0, i + 1).join("/"),
          isDirectory: i < tokens.length - 1,
          children: [],
        };

        treeCache.set(token, subtree);
        currentLevel.push(subtree);
        currentLevel = subtree.children;
      }
    });
  });

  return tree;
}

// Based on https://github.com/ghornich/sort-paths
function sortPathsTokens(paths: string[]): string[][] {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });

  return paths
    .map((path) => path.replace(/^\//, "").split("/"))
    .sort((a, b) => {
      const maxDepth = Math.max(a.length, b.length);
      for (let depth = 0; depth < maxDepth; depth++) {
        if (depth >= a.length) {
          return -1;
        } else if (depth >= b.length) {
          return 1;
        }

        const aToken = a[depth];
        const bToken = b[depth];
        if (aToken === bToken) {
          continue;
        }

        const aIsDir = depth < a.length - 1;
        const bIsDir = depth < b.length - 1;

        if (aIsDir === bIsDir) {
          return collator.compare(aToken, bToken);
        } else {
          return aIsDir ? -1 : 1;
        }
      }

      return -1;
    });
}
