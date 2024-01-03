import { For, Show } from 'solid-js';
import FileNode from './FileNode';
import type { TreeNode } from './FileTree';

interface Props extends TreeNode {
  onFileClick?: (node: TreeNode) => void;
}

export default function DirectoryNode(props: Props) {
  return (
    <li>
      <details open>
        <summary>
          <svg width="16" height="16" class="inline" viewBox="0 0 32 32">
            <path
              d="M27.4,5.5H18.2L16.1,9.7H4.3V26.5H29.5V5.5Zm0,18.7H6.6V11.8H27.4Zm0-14.5H19.2l1-2.1h7.1V9.7Z"
              style="fill:#dcb67a"
            />
            <polygon
              points="25.7 13.7 0.5 13.7 4.3 26.5 29.5 26.5 25.7 13.7"
              style="fill:#dcb67a"
            />
          </svg>
          {props.name}
        </summary>
        <ul>
          <For each={props.children}>
            {(node) => (
              <Show
                when={node.isDirectory}
                fallback={
                  <FileNode
                    onClick={() => props.onFileClick?.(node)}
                    {...node}
                  />
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
      </details>
    </li>
  );
}
