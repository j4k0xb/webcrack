import type * as monaco from 'monaco-editor';
import { basename } from 'path';

export function downloadFile(model: monaco.editor.ITextModel) {
  const blob = new Blob([model.getValue()], {
    type: 'application/javascript;charset=utf-8',
  });
  downloadBlob(blob, basename(model.uri.fsPath));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function openFile(cb: (content: string) => void = () => {}) {
  const input = document.createElement('input');
  input.type = 'file';
  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      cb(await file.text());
    }
  };
  input.click();
}
