import { For } from 'solid-js';
import { useTheme } from '../hooks/useTheme';
import { useSessions, type SavedModel } from '../indexeddb';

interface Props {
  onFileOpen?: (content: string) => void;
  onRestore?: (models: SavedModel[]) => void;
}

export default function Menu(props: Props) {
  const { sessions } = useSessions();
  const [theme, setTheme] = useTheme();

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
                  <For each={sessions()} fallback={<li>No recent files</li>}>
                    {(session) => (
                      <li>
                        <a
                          onClick={() => props.onRestore?.(session.models)}
                          class="truncate"
                        >
                          {new Date(session.timestamp).toLocaleString()} -
                          <code>{session.models[0].value.slice(0, 20)}…</code>
                        </a>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </li>
            <li class="disabled">
              <a>Save</a>
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
                Dark Mode
                <input
                  type="checkbox"
                  class="toggle toggle-sm ml-auto"
                  checked={theme() === 'dark'}
                  onClick={(e) =>
                    setTheme(e.currentTarget.checked ? 'dark' : 'light')
                  }
                />
              </label>
            </li>
            <li class="disabled">
              <label class="h-10 flex items-center">
                Prompt on leave
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm ml-auto"
                  disabled
                />
              </label>
            </li>
            <li class="disabled">
              <label class="h-10 flex items-center">
                File History
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm ml-auto"
                  disabled
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
