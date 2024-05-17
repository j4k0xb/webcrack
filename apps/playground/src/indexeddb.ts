import { openDB, type DBSchema } from 'idb';
import type * as monaco from 'monaco-editor';

export interface SavedModel {
  value: string;
  language: string;
  uri: string;
}

interface MyDB extends DBSchema {
  models: {
    key: string;
    value: SavedModel;
  };
}

async function initDB() {
  return openDB<MyDB>('models', 1, {
    upgrade(db) {
      db.createObjectStore('models', { keyPath: 'uri' });
    },
  });
}

export async function saveModels(models: monaco.editor.ITextModel[]) {
  console.log('Saving models...', models.length);
  const db = await initDB();
  await db.clear('models');
  await Promise.all(
    models.map(async (model) => {
      await db.put('models', {
        value: model.getValue(),
        language: model.getLanguageId(),
        uri: model.uri.toString(),
      });
    }),
  );
}

export async function clearSavedModels() {
  const db = await initDB();
  await db.clear('models');
}

export async function saveModel(model: monaco.editor.ITextModel) {
  const db = await initDB();
  await db.put('models', {
    value: model.getValue(),
    language: model.getLanguageId(),
    uri: model.uri.toString(),
  });
}

export async function loadSavedModels(): Promise<SavedModel[]> {
  const db = await initDB();
  return db.getAll('models');
}
