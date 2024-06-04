import { For } from 'solid-js';
import { setSettings, settings, type Settings } from '../hooks/useSettings';
import { useWorkspaces, type Workspace } from '../indexeddb';

interface Props {
  onFileOpen?: (content: string) => void;
  onSave?: () => void;
  onRestore?: (workspace: Workspace) => void;
}

export default function Menu(props: Props) {
  const { workspaces } = useWorkspaces();

  function openFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const content = await file.text();
      props.onFileOpen?.(content);
    };
    input.click();
  }

  return (
    <ul class="menu menu-sm menu-horizontal bg-base-200 w-full">
      <li>
        <details>
          <summary>File</summary>
          <ul class="min-w-52 z-10 !px-0">
            <li>
              <a onClick={openFile}>Open File…</a>
            </li>
            <li>
              <div class="dropdown dropdown-right dropdown-hover transform-none">
                <div tabindex="0" role="button">
                  Open Recent
                </div>
                <ul
                  tabindex="0"
                  class="dropdown-content z-10 menu ml-0 p-2 shadow bg-base-100 rounded-box"
                >
                  <For each={workspaces()} fallback={<li>No recent files</li>}>
                    {(workspace) => (
                      <li>
                        <a
                          onClick={() => props.onRestore?.(workspace)}
                          class="truncate"
                        >
                          {new Date(workspace.timestamp).toLocaleString()} -
                          <code>{workspace.models[0].value.slice(0, 20)}…</code>
                        </a>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </li>
            <li>
              <a onClick={props.onSave}>Save</a>
            </li>
          </ul>
        </details>
      </li>
      <li>
        <details>
          <summary>Settings</summary>
          <ul class="min-w-52 z-10">
            <li>
              <label class="h-10 flex items-center">
                Theme
                <select
                  class="select select-sm ml-auto"
                  value={settings.theme}
                  onChange={(e) =>
                    setSettings(
                      'theme',
                      e.currentTarget.value as Settings['theme'],
                    )
                  }
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </label>
            </li>
            <li>
              <label class="h-10 flex items-center">
                Confirm on Leave
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm ml-auto"
                  checked={settings.confirmOnLeave}
                  onChange={(e) =>
                    setSettings('confirmOnLeave', e.currentTarget.checked)
                  }
                />
              </label>
            </li>
            <li>
              <label class="h-10 flex items-center">
                Workspace History
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm ml-auto"
                  checked={settings.workspaceHistory}
                  onChange={(e) =>
                    setSettings('workspaceHistory', e.currentTarget.checked)
                  }
                />
              </label>
            </li>
          </ul>
        </details>
      </li>
      <li>
        <a href="https://github.com/j4k0xb/webcrack" target="_blank">
          GitHub
        </a>
      </li>
      <li>
        <a href="/docs" target="_blank">
          Documentation
        </a>
      </li>
    </ul>
  );
}
