import * as monaco from 'monaco-editor';
import { parse as parsePath } from 'path';
import {
  For,
  Show,
  batch,
  createMemo,
  createSignal,
  onCleanup,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import Alert from './components/Alert';
import Breadcrumbs from './components/Breadcrumbs';
import FileDropZone from './components/FileDropZone';
import MonacoEditor from './components/MonacoEditor';
import ProgressBar from './components/ProgressBar';
import Sidebar from './components/Sidebar';
import Tab from './components/Tab.jsx';
import Menu from './components/menu/Menu';
import { DeobfuscateContextProvider } from './context/DeobfuscateContext';
import { settings } from './hooks/useSettings';
import { useWorkspaces, type Workspace } from './indexeddb';
import { debounce } from './utils/debounce';
import { downloadFile } from './utils/files';
import type { DeobfuscateResult } from './webcrack.worker';

export const [config, setConfig] = createStore({
  deobfuscate: true,
  unminify: true,
  unpack: true,
  jsx: true,
  mangleRegex: null as RegExp | null,
});

function App() {
  const { saveModels, setWorkspaceId } = useWorkspaces();
  const [untitledCounter, setUntitledCounter] = createSignal(1);
  const [models, setModels] = createSignal<monaco.editor.ITextModel[]>([
    monaco.editor.createModel(
      '',
      'javascript',
      monaco.Uri.from({ scheme: 'untitled', path: 'Untitled-1.js' }),
    ),
  ]);
  const [tabs, setTabs] = createSignal<monaco.editor.ITextModel[]>(models());
  const [activeTab, setActiveTab] = createSignal<
    monaco.editor.ITextModel | undefined
  >(tabs()[0]);

  const fileModels = createMemo(() =>
    models().filter((m) => m.uri.scheme === 'file'),
  );
  const untitledModels = createMemo(() =>
    models().filter((m) => m.uri.scheme === 'untitled'),
  );
  const filePaths = createMemo(() =>
    fileModels().map((model) => model.uri.path),
  );
  const hasNonEmptyModels = () => models().some((m) => m.getValueLength() > 0);

  window.onbeforeunload = () => {
    if (settings.confirmOnLeave && hasNonEmptyModels()) {
      saveModels(models()).catch(console.error);
      return true;
    }
    return undefined;
  };

  const saveModelsDebounced = debounce(() => {
    if (settings.workspaceHistory) saveModels(models()).catch(console.error);
  }, 1000);

  async function restoreWorkspace(workspace: Workspace) {
    await saveModels(models());
    setWorkspaceId(workspace.id);

    batch(() => {
      models().forEach((model) => model.dispose());

      setModels(
        workspace.models.map((model) =>
          monaco.editor.createModel(
            model.value,
            model.language,
            monaco.Uri.parse(model.uri),
          ),
        ),
      );

      setTabs(untitledModels());
      setActiveTab(untitledModels()[0]);
    });
  }

  onCleanup(() => {
    models().forEach((model) => model.dispose());
  });

  function openTab(tab: monaco.editor.ITextModel) {
    if (!tabs().includes(tab)) {
      setTabs([...tabs(), tab]);
    }
    setActiveTab(tab);
  }

  function openFile(path: string) {
    const model = fileModels().find((m) => m.uri.path === '/' + path);
    if (!model) {
      return console.warn(`No model found for path: ${path}`);
    }
    openTab(model);
  }

  function closeTab(tab: monaco.editor.ITextModel) {
    const index = tabs().indexOf(tab);
    if (activeTab() === tab) {
      setActiveTab(tabs()[index > 0 ? index - 1 : 1]);
    }
    setTabs(tabs().filter((t) => t !== tab));
    if (tab.uri.scheme === 'untitled') {
      tab.dispose();
      // FIXME: resets folder expansion state
      setModels(models().filter((m) => m !== tab));
    }
  }

  function openUntitledTab() {
    setUntitledCounter(untitledCounter() + 1);
    const model = monaco.editor.createModel(
      '',
      'javascript',
      monaco.Uri.from({
        scheme: 'untitled',
        path: `Untitled-${untitledCounter()}.js`,
      }),
    );
    setModels([...models(), model]);
    openTab(model);
    return model;
  }

  function onDeobfuscateResult(result: DeobfuscateResult) {
    let model = activeTab();

    if (result.files.length === 0) {
      model ||= openUntitledTab();
      model.pushEditOperations(
        [],
        [
          {
            range: model.getFullModelRange(),
            text: result.code,
          },
        ],
        () => null,
      );
      return;
    }

    if (!model || model.uri.scheme === 'file') {
      model = openUntitledTab();
    }

    model.setValue(result.code);

    fileModels().forEach((model) => model.dispose());
    setTabs(untitledModels());

    const seenPaths = new Set<string>();
    const deduplicatedFiles = result.files.filter((file) => {
      if (seenPaths.has(file.path)) return false;
      seenPaths.add(file.path);
      return true;
    });

    setModels([
      ...untitledModels(),
      ...deduplicatedFiles.map((file) =>
        monaco.editor.createModel(
          file.code,
          'javascript',
          monaco.Uri.file(file.path),
        ),
      ),
    ]);
  }

  async function loadFromURL(url: string) {
    const response = await fetch(url)
      .then((res) => (res.ok ? res : Promise.reject(new Error())))
      .catch(() =>
        fetch('https://corsproxy.io/?url=' + encodeURIComponent(url)),
      );

    if (response.ok) {
      const model = activeTab() || openUntitledTab();
      model.setValue(await response.text());
    }
  }

  {
    const queryParams = new URLSearchParams(location.search);
    const urlParam = queryParams.get('url');
    const codeParam = queryParams.get('code');

    if (urlParam !== null) {
      loadFromURL(urlParam).catch(console.error);
    } else if (codeParam !== null) {
      const model = activeTab() || openUntitledTab();
      model.setValue(codeParam);
    }
  }

  return (
    <DeobfuscateContextProvider
      code={activeTab()?.getValue()}
      options={{ ...config }}
      onResult={onDeobfuscateResult}
    >
      <ProgressBar />
      <Menu
        onFileOpen={(content) => {
          openUntitledTab().setValue(content);
        }}
        onLoadFromURL={(url) => {
          loadFromURL(url).catch(console.error);
        }}
        onSave={() => {
          if (activeTab()) downloadFile(activeTab()!);
        }}
        onSaveAll={() => {
          import('./utils/zip.js')
            .then((module) => module.downloadModelsZIP(models()))
            .catch(console.error);
        }}
        onRestore={(workspace) => {
          restoreWorkspace(workspace).catch(console.error);
        }}
      />
      {/* Page */}
      <div class="flex flex-1 overflow-hidden">
        <Sidebar paths={filePaths()} onFileClick={openFile} />

        {/* Workspace */}
        <main class="flex-1 flex flex-col overflow-hidden">
          <div class="tabs tabs-lift tabs-sm shrink-0 justify-start flex-nowrap overflow-x-auto bg-base-300">
            <For each={tabs()}>
              {(tab) => (
                <Tab
                  path={tab.uri.path}
                  active={activeTab() === tab}
                  onClick={() => setActiveTab(tab)}
                  onClose={() => closeTab(tab)}
                />
              )}
            </For>
            <div class="tab" title="New tab" onClick={openUntitledTab}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M12 5l0 14" />
                <path d="M5 12l14 0" />
              </svg>
            </div>
          </div>
          <Show when={activeTab()?.uri.scheme === 'file'}>
            <Breadcrumbs path={activeTab()!.uri.path} />
          </Show>

          <MonacoEditor
            models={models()}
            currentModel={activeTab()}
            onModelChange={openTab}
            onValueChange={saveModelsDebounced}
            onFileOpen={(content) => {
              openUntitledTab().setValue(content);
            }}
          />
        </main>
      </div>
      <Alert />
      <FileDropZone
        onDrop={(files) => {
          const existingPaths = new Set(
            untitledModels().map((m) => m.uri.path),
          );

          const newModels = files.map((file) => {
            let path = file.name;
            for (let i = 1; existingPaths.has(path); i++) {
              const parts = parsePath(path);
              path = `${parts.name.replace(/ \(\d+\)$/, '')} (${i})${parts.ext}`;
            }
            return monaco.editor.createModel(
              file.content,
              'javascript',
              monaco.Uri.from({ scheme: 'untitled', path }),
            );
          });

          setModels([...models(), ...newModels]);
          setTabs([...tabs(), ...newModels]);
          openTab(newModels.at(-1)!);
        }}
      />
    </DeobfuscateContextProvider>
  );
}

export default App;
