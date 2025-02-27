import { Show, createEffect, createSignal } from 'solid-js';
import { useDeobfuscateContext } from '../context/DeobfuscateContext';

export default function ProgressBar() {
  const { deobfuscating, progress } = useDeobfuscateContext();
  const [progressShown, setProgressShown] = createSignal(false);

  createEffect(() => {
    if (deobfuscating()) setProgressShown(true);
    else if (progress() === 100) setTimeout(() => setProgressShown(false), 500);
    else setProgressShown(false);
  });

  return (
    <Show when={progressShown()}>
      <style>
        {`
          .progress::-webkit-progress-value {
            transition: width 300ms ease;
          }
        `}
      </style>
      <progress
        class="progress progress-info absolute top-0 h-0.5 w-full z-10 pointer-events-none bg-transparent"
        value={progress() / 100}
      />
    </Show>
  );
}
