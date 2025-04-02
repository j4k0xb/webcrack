import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import monacoEditor, {
  type IMonacoEditorOpts,
} from 'vite-plugin-monaco-editor';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import solid from 'vite-plugin-solid';

// https://github.com/vdesjs/vite-plugin-monaco-editor/issues/21
const { default: monacoEditorPlugin } = monacoEditor as unknown as {
  default: (options: IMonacoEditorOpts) => Plugin;
};

export default defineConfig({
  optimizeDeps: {
    exclude: ['isolated-vm'],
  },
  build: {
    target: 'chrome89',
    sourcemap: true,
    rollupOptions: {
      external: ['isolated-vm'],
      output: {
        format: 'es',
        manualChunks: (id) => {
          if (id.includes('monaco-editor')) return 'monaco-editor';
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      // @codemod/matchers imports @codemod/utils which imports @babel/core, but it's not needed
      // by replacing it with a dummy module we can reduce the bundle size by 360kb
      '@babel/core': path.resolve(import.meta.dirname, 'src/_empty.ts'),
      'isolated-vm': path.resolve(import.meta.dirname, 'src/_empty.ts'),
      webcrack: path.resolve(
        import.meta.dirname,
        '../../packages/webcrack/src',
      ),
    },
  },
  plugins: [
    tailwindcss(),
    nodePolyfills({ exclude: ['fs'] }),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'typescript'],
    }),
    solid(),
  ],
});
