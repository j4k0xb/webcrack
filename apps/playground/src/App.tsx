import * as monaco from 'monaco-editor';
import {
  For,
  Show,
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import Breadcrumbs from './components/Breadcrumbs';
import MonacoEditor from './components/MonacoEditor';
import Sidebar from './components/Sidebar';
import Tab from './components/Tab';
import { DeobfuscateContextProvider } from './context/DeobfuscateContext';
import {
  clearSavedModels,
  loadSavedModels,
  saveModels,
  type SavedModel,
} from './indexeddb';
import type { DeobfuscateResult } from './webcrack.worker';

export const [settings, setSettings] = createStore({
  deobfuscate: true,
  unminify: true,
  unpack: true,
  jsx: true,
  mangle: false,
});

function App() {
  const [untitledCounter, setUntitledCounter] = createSignal(1);
  const [models, setModels] = createSignal<monaco.editor.ITextModel[]>([
    monaco.editor.createModel(
      '',
      'javascript',
      monaco.Uri.from({ scheme: 'untitled', path: 'Untitled-1' }),
    ),
  ]);
  const [tabs, setTabs] = createSignal<monaco.editor.ITextModel[]>(models());
  const [activeTab, setActiveTab] = createSignal<
    monaco.editor.ITextModel | undefined
  >(tabs()[0]);
  const [savedModels, setSavedModels] = createSignal<SavedModel[]>([]);

  const fileModels = createMemo(() =>
    models().filter((m) => m.uri.scheme === 'file'),
  );
  const untitledModels = createMemo(() =>
    models().filter((m) => m.uri.scheme === 'untitled'),
  );
  const filePaths = createMemo(() =>
    fileModels().map((model) => model.uri.path),
  );

  loadSavedModels().then(setSavedModels).catch(console.error);
  setTimeout(() => setSavedModels([]), 5000);

  createEffect(() => {
    if (
      models().length === 0 ||
      models().every((m) => m.getValueLength() === 0)
    ) {
      return;
    }
    saveModels(models()).catch(console.error);
  });

  function restoreSavedModels() {
    batch(() => {
      models().forEach((model) => model.dispose());

      setModels(
        savedModels().map((model) =>
          monaco.editor.createModel(
            model.value,
            model.language,
            monaco.Uri.parse(model.uri),
          ),
        ),
      );
      console.log(
        'Loaded saved models',
        savedModels().map((m) => m.uri),
      );
      setSavedModels([]);

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
        path: `Untitled-${untitledCounter()}`,
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

    setModels([
      ...untitledModels(),
      ...result.files.map((file) =>
        monaco.editor.createModel(
          file.code,
          'javascript',
          monaco.Uri.file(file.path),
        ),
      ),
      monaco.editor.createModel(
        result.code,
        'javascript',
        monaco.Uri.file('deobfuscated.js'),
      ),
    ]);
  }

  function onDeobfuscateError(error: unknown) {
    console.error(error);
  }

  return (
    <DeobfuscateContextProvider
      code={activeTab()?.getValue()}
      options={{ ...settings }}
      onResult={onDeobfuscateResult}
      onError={onDeobfuscateError}
    >
      <Show when={savedModels().length > 0}>
        <div role="alert" class="alert absolute z-10 bottom-5 right-5 max-w-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="stroke-info shrink-0 w-6 h-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <span>
            Restore {savedModels().length} saved tabs from last session?
          </span>
          <div>
            <button
              class="btn btn-sm"
              onClick={() => {
                void clearSavedModels();
                setSavedModels([]);
              }}
            >
              Clear
            </button>
            <button class="btn btn-sm btn-primary" onClick={restoreSavedModels}>
              Load
            </button>
          </div>
        </div>
      </Show>

      <div class="h-screen flex">
        <Sidebar paths={filePaths()} onFileClick={openFile} />

        <main class="flex-1 overflow-auto">
          <div class="tabs tabs-lifted justify-start overflow-x-auto bg-base-300">
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
            onValueChange={() => {
              saveModels(models()).catch(console.error);
            }}
          />
        </main>
      </div>
    </DeobfuscateContextProvider>
  );
}

export default App;
