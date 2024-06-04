import type * as monaco from 'monaco-editor';
import { basename } from 'path';

export function downloadFile(model: monaco.editor.ITextModel) {
  const blob = new Blob([model.getValue()], {
    type: 'application/javascript;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', basename(model.uri.fsPath));
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
