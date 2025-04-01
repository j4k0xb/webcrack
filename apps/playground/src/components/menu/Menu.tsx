import { For, createSignal, onCleanup, onMount } from 'solid-js';
import { setSettings, settings, type Settings } from '../../hooks/useSettings';
import { useWorkspaces, type Workspace } from '../../indexeddb';
import { openFile } from '../../utils/files';
import { ctrlCmdIcon } from '../../utils/platform';
import MenuButton from './MenuButton';
import MenuDropdown from './MenuDropdown';
import MenuHeader from './MenuHeader';
import MenuSetting from './MenuSetting';

interface Props {
  onFileOpen?: (content: string) => void;
  onLoadFromURL?: (url: string) => void;
  onSave?: () => void;
  onSaveAll?: () => void;
  onRestore?: (workspace: Workspace) => void;
}

export default function Menu(props: Props) {
  const { workspaces } = useWorkspaces();
  const [openedMenu, setOpenedMenu] = createSignal<
    'file' | 'settings' | undefined
  >();
  let menuRef: HTMLUListElement | undefined;

  onMount(() => {
    document.addEventListener('click', onClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('click', onClickOutside);
  });

  function onClickOutside(event: MouseEvent) {
    if (menuRef && !menuRef.contains(event.target as Node)) {
      setOpenedMenu(undefined);
    }
  }

  return (
    <ul ref={menuRef} class="menu menu-horizontal bg-base-200 w-full">
      <MenuHeader
        title="File"
        open={openedMenu() === 'file'}
        onOpen={() => setOpenedMenu('file')}
      >
        <MenuButton
          shortcut={[ctrlCmdIcon, 'O']}
          onClick={() => openFile(props.onFileOpen)}
        >
          Open File…
        </MenuButton>
        <MenuButton
          onClick={() => {
            const url = prompt('Enter URL');
            if (url) {
              props.onLoadFromURL?.(url);
            }
          }}
        >
          Open File From URL…
        </MenuButton>
        <MenuDropdown title="Open Recent">
          <For each={workspaces()} fallback={<li>No recent files</li>}>
            {(workspace) => (
              <MenuButton
                class="whitespace-nowrap"
                onClick={() => props.onRestore?.(workspace)}
              >
                {new Date(workspace.timestamp).toLocaleString()} -
                <code class="overflow-x-clip text-ellipsis max-w-36">
                  {workspace.models[0].value.slice(0, 50)}
                </code>
              </MenuButton>
            )}
          </For>
        </MenuDropdown>
        <MenuButton shortcut={[ctrlCmdIcon, 'S']} onClick={props.onSave}>
          Save
        </MenuButton>
        <MenuButton onClick={props.onSaveAll}>Save All (.zip)</MenuButton>
      </MenuHeader>
      <MenuHeader
        title="Settings"
        open={openedMenu() === 'settings'}
        onOpen={() => setOpenedMenu('settings')}
      >
        <MenuSetting>
          Theme
          <select
            class="select select-sm ml-auto"
            value={settings.theme}
            onChange={(e) =>
              setSettings('theme', e.currentTarget.value as Settings['theme'])
            }
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </MenuSetting>
        <MenuSetting>
          Confirm on Leave
          <input
            type="checkbox"
            class="checkbox checkbox-sm ml-auto"
            checked={settings.confirmOnLeave}
            onChange={(e) =>
              setSettings('confirmOnLeave', e.currentTarget.checked)
            }
          />
        </MenuSetting>
        <MenuSetting>
          Workspace History
          <input
            type="checkbox"
            class="checkbox checkbox-sm ml-auto"
            checked={settings.workspaceHistory}
            onChange={(e) =>
              setSettings('workspaceHistory', e.currentTarget.checked)
            }
          />
        </MenuSetting>
        <MenuSetting>
          Word Wrap
          <input
            type="checkbox"
            class="checkbox checkbox-sm ml-auto"
            checked={settings.wordWrap}
            onChange={(e) => setSettings('wordWrap', e.currentTarget.checked)}
          />
        </MenuSetting>
        <MenuSetting>
          Sticky Scroll
          <input
            type="checkbox"
            class="checkbox checkbox-sm ml-auto"
            checked={settings.stickyScroll}
            onChange={(e) =>
              setSettings('stickyScroll', e.currentTarget.checked)
            }
          />
        </MenuSetting>
      </MenuHeader>
      <li>
        <a
          href="https://github.com/j4k0xb/webcrack"
          target="_blank"
          class="link link-hover"
        >
          GitHub
        </a>
      </li>
      <li>
        <a href="/docs" target="_blank" class="link link-hover">
          Documentation
        </a>
      </li>
    </ul>
  );
}
