import { ParentProps, createContext, createSignal, useContext } from "solid-js";
import type { Options } from "webcrack";
import { evalCode } from "../sandbox";
import {
  DeobfuscateResult,
  WorkerRequest,
  WorkerResponse,
} from "../webcrack.worker";
import WebcrackWorker from "../webcrack.worker?worker";

let worker = new WebcrackWorker();

const postMessage = (message: WorkerRequest) => worker.postMessage(message);

function useProviderValue(props: Props) {
  const [deobfuscating, setDeobfuscating] = createSignal(false);
  const [progress, setProgress] = createSignal(0);

  function cancelDeobfuscate() {
    if (!deobfuscating()) return console.warn("Not deobfuscating...");

    setDeobfuscating(false);
    worker.terminate();
    worker = new WebcrackWorker();
  }

  function deobfuscate() {
    if (deobfuscating()) return console.warn("Already deobfuscating...");
    if (!props.code) return console.warn("No code to deobfuscate...");

    setProgress(0);
    setDeobfuscating(true);
    postMessage({
      type: "deobfuscate",
      code: props.code,
      options: props.options,
    });

    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      if (data.type === "sandbox") {
        evalCode(data.code)
          .then((result) => postMessage({ type: "sandbox", result }))
          .catch((error) => {
            cancelDeobfuscate();
            props.onError(error);
          });
      } else if (data.type === "progress") {
        setProgress(data.value);
      } else if (data.type === "result") {
        setDeobfuscating(false);
        props.onResult(data);
      } else if (data.type === "error") {
        setDeobfuscating(false);
        props.onError(data.error);
      }
    };
  }

  return {
    deobfuscating,
    cancelDeobfuscate,
    deobfuscate,
    progress,
  };
}

const DeobfuscateContext = createContext<ReturnType<typeof useProviderValue>>();

interface Props {
  code: string | undefined;
  options: Options;
  onResult: (result: DeobfuscateResult) => void;
  onError: (error: unknown) => void;
}

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
