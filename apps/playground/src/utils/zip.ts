import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import type * as monaco from 'monaco-editor';
import { downloadBlob } from './files.js';

export async function downloadModelsZIP(models: monaco.editor.ITextModel[]) {
  const zipWriter = new ZipWriter(new BlobWriter('application/zip'), {
    dataDescriptor: false,
  });

  await Promise.all(
    models.map((model) => {
      const path = model.uri.fsPath.replace(/^\//, '');
      const reader = new TextReader(model.getValue());
      return zipWriter.add(path, reader);
    }),
  );

  const zipBlob = await zipWriter.close();
  downloadBlob(zipBlob, 'webcrack-export.zip');
}
