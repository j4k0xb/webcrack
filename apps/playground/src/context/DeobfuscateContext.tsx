import type { ParentProps } from 'solid-js';
import { createContext, createSignal, useContext } from 'solid-js';
import type { Options } from 'webcrack';
import { evalCode } from '../sandbox';
import type {
  DeobfuscateResult,
  WorkerRequest,
  WorkerResponse,
} from '../webcrack.worker';
import WebcrackWorker from '../webcrack.worker?worker';

let worker = new WebcrackWorker();

const postMessage = (message: WorkerRequest) => worker.postMessage(message);

interface Props {
  code: string | undefined;
  options: Options & { mangleRegex: RegExp | null };
  onResult: (result: DeobfuscateResult) => void;
}

function useProviderValue(props: Props) {
  const [deobfuscating, setDeobfuscating] = createSignal(false);
  const [progress, setProgress] = createSignal(0);
  const [alert, setAlert] = createSignal<string | null>(null);

  function cancelDeobfuscate() {
    if (!deobfuscating()) return console.warn('Not deobfuscating...');

    setDeobfuscating(false);
    worker.terminate();
    worker = new WebcrackWorker();
  }

  function deobfuscate() {
    if (deobfuscating()) return console.warn('Already deobfuscating...');
    if (!props.code) return console.warn('No code to deobfuscate...');

    setProgress(0);
    setDeobfuscating(true);
    postMessage({
      type: 'deobfuscate',
      code: props.code,
      options: props.options,
    });

    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      if (data.type === 'sandbox') {
        evalCode(data.code)
          .then((result) => postMessage({ type: 'sandbox', result }))
          .catch((error) => {
            cancelDeobfuscate();
            setAlert(String(error));
            console.error(error);
          });
      } else if (data.type === 'progress') {
        setProgress(data.value);
      } else if (data.type === 'result') {
        setAlert(null);
        setDeobfuscating(false);
        props.onResult(data);
      } else if (data.type === 'error') {
        setDeobfuscating(false);
        setAlert(data.error.toString());
      }
    };
  }

  return {
    deobfuscating,
    cancelDeobfuscate,
    deobfuscate,
    progress,
    alert,
    setAlert,
  };
}

const DeobfuscateContext = createContext<ReturnType<typeof useProviderValue>>();

export function DeobfuscateContextProvider(props: ParentProps<Props>) {
  const value = useProviderValue(props);
  return (
    <DeobfuscateContext.Provider value={value}>
      {props.children}
    </DeobfuscateContext.Provider>
  );
}

export function useDeobfuscateContext() {
  return useContext(DeobfuscateContext)!;
}
