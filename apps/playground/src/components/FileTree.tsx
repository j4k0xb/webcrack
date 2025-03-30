import { createMemo, For, Show } from 'solid-js';
import DirectoryNode from './DirectoryNode';
import FileNode from './FileNode';

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
  const cachedPaths = createMemo(() => props.paths, props.paths, {
    equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
  });
  const items = () => generateTreeNodes(cachedPaths());

  return (
    <ul class="menu menu-xs flex-nowrap bg-base-200 rounded-lg w-full overflow-y-auto scrollbar-thin">
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
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  });

  const root: TreeNode = {
    path: '',
    name: '',
    isDirectory: true,
    children: [],
  };

  for (const path of paths) {
    const parts = path.split('/').filter(Boolean);
    let currentNode = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = i === parts.length - 1;
      let childNode = currentNode.children.find((child) => child.name === part);

      if (!childNode) {
        childNode = {
          path: (currentNode.path + '/' + part).replace(/^\//, ''),
          name: part,
          isDirectory: !isLastPart,
          children: [],
        };
        currentNode.children.push(childNode);
        currentNode.children.sort(
          (a, b) =>
            Number(b.isDirectory) - Number(a.isDirectory) ||
            collator.compare(a.name, b.name),
        );
      }

      currentNode = childNode;
    }
  }

  return root.children;
}
