import { Show, createEffect, on } from 'solid-js';
import { useDeobfuscateContext } from '../context/DeobfuscateContext';

export default function Alert() {
  const { alert, setAlert } = useDeobfuscateContext();
  let divRef: HTMLDivElement | undefined;

  createEffect(
    on(alert, () => {
      divRef?.classList.add('translate-y-96', 'opacity-0');
      setTimeout(() => {
        divRef?.classList.remove('translate-y-96', 'opacity-0');
      }, 0);
    }),
  );

  return (
    <Show when={alert()}>
      <div
        ref={divRef}
        role="alert"
        class="alert alert-error fixed z-10 max-w-xl m-5 bottom-0 right-0 transition translate-y-96 opacity-0 ease-out duration-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
          <path d="M12 9v4" />
          <path d="M12 16v.01" />
        </svg>
        <span class="break-all">{alert()}</span>
        <div>
          <button
            class="btn btn-sm btn-circle btn-ghost"
            title="Close"
            onClick={() => setAlert(null)}
          >
            ✕
          </button>
        </div>
      </div>
    </Show>
  );
}
