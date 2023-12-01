import { Options, Sandbox, webcrack } from "webcrack";

export type WorkerRequest =
  | { type: "deobfuscate"; code: string; options: Options }
  | { type: "sandbox"; result: unknown };

export type WorkerResponse =
  | { type: "sandbox"; code: string }
  | ({ type: "result" } & DeobfuscateResult)
  | { type: "progress"; value: number }
  | { type: "error"; error: unknown };

export interface DeobfuscateResult {
  code: string;
  files: { code: string; path: string }[];
}

const postMessage = (message: WorkerResponse) => self.postMessage(message);

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  if (data.type !== "deobfuscate") return;

  // worker->window->sandybox because it accesses the DOM, which is not available in workers
  const sandbox: Sandbox = (code) => {
    return new Promise((resolve) => {
      self.addEventListener("message", onSandboxResponse);
      postMessage({ type: "sandbox", code });

      function onSandboxResponse({ data }: MessageEvent<WorkerRequest>) {
        if (data.type === "sandbox") {
          self.removeEventListener("message", onSandboxResponse);
          resolve(data.result);
        }
      }
    });
  };

  function onProgress(value: number) {
    postMessage({ type: "progress", value });
  }

  try {
    const result = await webcrack(data.code, {
      sandbox,
      onProgress,
      ...data.options,
    });
    const files = Array.from(result.bundle?.modules ?? [], ([, module]) => ({
      code: module.code,
      path: module.path.replace(/\.?\/?/, ""),
    }));

    postMessage({ type: "result", code: result.code, files });
  } catch (error) {
    postMessage({ type: "error", error });
  }
};
