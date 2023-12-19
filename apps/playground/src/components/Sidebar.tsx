import { Show, createEffect, createSignal } from 'solid-js';
import { setSettings, settings } from '../App';
import { useDeobfuscateContext } from '../context/DeobfuscateContext';
import { useTheme } from '../hooks/useTheme';
import FileTree from './FileTree';

interface Props {
  paths: string[];
  onFileClick?: (path: string) => void;
}

export default function Sidebar(props: Props) {
  const { deobfuscate, deobfuscating, cancelDeobfuscate, progress } =
    useDeobfuscateContext();
  const [theme, setTheme] = useTheme();
  const [progressShown, setProgressShown] = createSignal(false);

  createEffect(() => {
    if (deobfuscating()) setProgressShown(true);
    else if (progress() === 100) setTimeout(() => setProgressShown(false), 500);
    else setProgressShown(false);
  });

  return (
    <nav class="flex flex-col w-12 sm:w-72 bg-base-200">
      <style>
        {progressShown() &&
          `
          .progress::-webkit-progress-value {
            transition: width 250ms ease;
          }
        `}
      </style>
      <progress
        class="progress flex-shrink-0"
        classList={{ invisible: !progressShown() }}
        value={progress() / 100}
      />

      <div class="flex justify-center py-4">
        <Show
          when={deobfuscating()}
          fallback={
            <button
              class="btn btn-primary"
              title="Start [Alt+Enter]"
              onClick={deobfuscate}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M7 4v16l13 -8z" />
              </svg>
              <span class="hidden sm:inline">Start</span>
            </button>
          }
        >
          <button class="btn btn-error btn-outline" onClick={cancelDeobfuscate}>
            <span class="loading loading-spinner"></span>Cancel
          </button>
        </Show>
      </div>

      <label class="label cursor-pointer px-4 hover:bg-base-100 group">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M12 21a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3a12 12 0 0 0 8.5 3a12 12 0 0 1 -.078 7.024" />
          <path d="M20 21l2 -2l-2 -2" />
          <path d="M17 17l-2 2l2 2" />
        </svg>
        <span class="label-text ml-4 mr-auto hidden sm:inline">
          Deobfuscate{' '}
          <a
            href="/docs/concepts/deobfuscate.html"
            target="_blank"
            class="link p-2 hidden group-hover:inline"
          >
            ?
          </a>
        </span>
        <input
          type="checkbox"
          class="checkbox checkbox-sm hidden sm:inline"
          checked={settings.deobfuscate}
          onClick={(e) => setSettings('deobfuscate', e.currentTarget.checked)}
        />
      </label>
      <label class="label cursor-pointer px-4 hover:bg-base-100 group">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M5 21h14" />
          <path d="M6 18h2" />
          <path d="M7 18v3" />
          <path d="M9 11l3 3l6 -6l-3 -3z" />
          <path d="M10.5 12.5l-1.5 1.5" />
          <path d="M17 3l3 3" />
          <path d="M12 21a6 6 0 0 0 3.715 -10.712" />
        </svg>
        <span class="label-text ml-4 mr-auto hidden sm:inline">
          Unminify{' '}
          <a
            href="/docs/concepts/unminify.html"
            target="_blank"
            class="link p-2 hidden group-hover:inline"
          >
            ?
          </a>
        </span>
        <input
          type="checkbox"
          class="checkbox checkbox-sm hidden sm:inline"
          checked={settings.unminify}
          onClick={(e) => setSettings('unminify', e.currentTarget.checked)}
        />
      </label>
      <label class="label cursor-pointer px-4 hover:bg-base-100 group">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5" />
          <path d="M12 12l8 -4.5" />
          <path d="M12 12l0 9" />
          <path d="M12 12l-8 -4.5" />
          <path d="M16 5.25l-8 4.5" />
        </svg>
        <span class="label-text ml-4 mr-auto hidden sm:inline">
          Unpack Bundle{' '}
          <a
            href="/docs/concepts/unpack.html"
            target="_blank"
            class="link p-2 hidden group-hover:inline"
          >
            ?
          </a>
        </span>
        <input
          type="checkbox"
          class="checkbox checkbox-sm hidden sm:inline"
          checked={settings.unpack}
          onClick={(e) => setSettings('unpack', e.currentTarget.checked)}
        />
      </label>
      <label class="label cursor-pointer px-4 hover:bg-base-100 group">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M6.306 8.711c-2.602 .723 -4.306 1.926 -4.306 3.289c0 2.21 4.477 4 10 4c.773 0 1.526 -.035 2.248 -.102" />
          <path d="M17.692 15.289c2.603 -.722 4.308 -1.926 4.308 -3.289c0 -2.21 -4.477 -4 -10 -4c-.773 0 -1.526 .035 -2.25 .102" />
          <path d="M6.305 15.287c-.676 2.615 -.485 4.693 .695 5.373c1.913 1.105 5.703 -1.877 8.464 -6.66c.387 -.67 .733 -1.339 1.036 -2" />
          <path d="M17.694 8.716c.677 -2.616 .487 -4.696 -.694 -5.376c-1.913 -1.105 -5.703 1.877 -8.464 6.66c-.387 .67 -.733 1.34 -1.037 2" />
          <path d="M12 5.424c-1.925 -1.892 -3.82 -2.766 -5 -2.084c-1.913 1.104 -1.226 5.877 1.536 10.66c.386 .67 .793 1.304 1.212 1.896" />
          <path d="M12 18.574c1.926 1.893 3.821 2.768 5 2.086c1.913 -1.104 1.226 -5.877 -1.536 -10.66c-.375 -.65 -.78 -1.283 -1.212 -1.897" />
          <path d="M11.5 12.866a1 1 0 1 0 1 -1.732a1 1 0 0 0 -1 1.732z" />
        </svg>
        <span class="label-text ml-4 mr-auto hidden sm:inline">
          Decompile JSX{' '}
          <a
            href="/docs/concepts/jsx.html"
            target="_blank"
            class="link p-2 hidden group-hover:inline"
          >
            ?
          </a>
        </span>
        <input
          type="checkbox"
          class="checkbox checkbox-sm hidden sm:inline"
          checked={settings.jsx}
          onClick={(e) => setSettings('jsx', e.currentTarget.checked)}
        />
      </label>
      <label class="label cursor-pointer px-4 hover:bg-base-100">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M3 16v-6a2 2 0 1 1 4 0v6" />
          <path d="M3 13h4" />
          <path d="M10 8v6a2 2 0 1 0 4 0v-1a2 2 0 1 0 -4 0v1" />
          <path d="M20.732 12a2 2 0 0 0 -3.732 1v1a2 2 0 0 0 3.726 1.01" />
        </svg>
        <span class="label-text ml-4 mr-auto hidden sm:inline">
          Mangle Variables
        </span>
        <input
          type="checkbox"
          class="checkbox checkbox-sm hidden sm:inline"
          checked={settings.mangle}
          onClick={(e) => setSettings('mangle', e.currentTarget.checked)}
        />
      </label>

      <label class="label cursor-pointer px-4 hover:bg-base-100">
        <Show
          when={theme() === 'light'}
          fallback={
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
            </svg>
          }
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
            <path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" />
          </svg>
        </Show>
        <span class="label-text ml-4 mr-auto hidden sm:inline">Dark Mode</span>
        <input
          type="checkbox"
          class="toggle toggle-sm hidden sm:inline"
          checked={theme() === 'dark'}
          onClick={(e) => setTheme(e.currentTarget.checked ? 'dark' : 'light')}
        ></input>
      </label>

      <FileTree
        paths={props.paths}
        onFileClick={(node) => props.onFileClick?.(node.path)}
      />

      <div class="flex flex-wrap gap-4 m-4 mt-auto">
        <a
          href="https://github.com/j4k0xb/webcrack"
          class="link link-primary"
          target="_blank"
        >
          GitHub
        </a>
        <a href="/docs" class="link link-primary" target="_blank">
          Docs
        </a>
      </div>
    </nav>
  );
}
