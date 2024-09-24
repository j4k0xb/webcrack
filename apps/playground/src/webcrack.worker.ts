import type { Options, Sandbox } from 'webcrack';
import { webcrack } from 'webcrack';
import type { MangleMode } from './App';

export type WorkerRequest =
  | {
      type: 'deobfuscate';
      code: string;
      options: Options & { mangleMode: MangleMode };
    }
  | { type: 'sandbox'; result: unknown };

export type WorkerResponse =
  | { type: 'sandbox'; code: string }
  | ({ type: 'result' } & DeobfuscateResult)
  | { type: 'progress'; value: number }
  | { type: 'error'; error: Error };

export interface DeobfuscateResult {
  code: string;
  files: { code: string; path: string }[];
}

const postMessage = (message: WorkerResponse) => self.postMessage(message);

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  if (data.type !== 'deobfuscate') return;

  // worker->window->sandybox because it accesses the DOM, which is not available in workers
  const sandbox: Sandbox = (code) => {
    return new Promise((resolve) => {
      self.addEventListener('message', onSandboxResponse);
      postMessage({ type: 'sandbox', code });

      function onSandboxResponse({ data }: MessageEvent<WorkerRequest>) {
        if (data.type === 'sandbox') {
          self.removeEventListener('message', onSandboxResponse);
          resolve(data.result);
        }
      }
    });
  };

  function onProgress(value: number) {
    postMessage({ type: 'progress', value });
  }

  try {
    const result = await webcrack(data.code, {
      sandbox,
      onProgress,
      ...data.options,
      mangle: convertMangleMode(data.options.mangleMode),
    });
    const files = Array.from(result.bundle?.modules ?? [], ([, module]) => ({
      code: module.code,
      path: module.path.replace(/\.?\/?/, ''),
    }));

    postMessage({ type: 'result', code: result.code, files });
  } catch (error) {
    // Babel SyntaxError dynamically sets `error.message`, has to be
    // accessed/logged before postMessage to be properly cloned.
    console.error(error);
    postMessage({ type: 'error', error: error as Error });
  }
};

function convertMangleMode(mode: MangleMode) {
  const HEX_IDENTIFIER = /_0x[a-f\d]+/i;

  switch (mode) {
    case 'off':
      return false;
    case 'all':
      return true;
    case 'hex':
      return (id: string) => HEX_IDENTIFIER.test(id);
    case 'short':
      return (id: string) => id.length <= 2;
  }
}
