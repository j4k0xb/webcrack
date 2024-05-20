import { openDB, type DBSchema } from 'idb';
import type * as monaco from 'monaco-editor';

const SESSION_ID = Math.random().toString(36).slice(2);
const MAX_SESSIONS = 10;

export interface Session {
  timestamp: number;
  id: string;
  models: SavedModel[];
}

export interface SavedModel {
  value: string;
  language: string;
  uri: string;
}

interface MyDB extends DBSchema {
  sessions: {
    key: string;
    value: Session;
  };
}

async function initDB() {
  return openDB<MyDB>('models', 1, {
    upgrade(db) {
      db.createObjectStore('sessions', { keyPath: 'id' });
    },
  });
}

export async function saveModels(models: monaco.editor.ITextModel[]) {
  console.log('Saving models...', models.length);
  const db = await initDB();
  await db.put('sessions', {
    id: SESSION_ID,
    timestamp: Date.now(),
    models: models.map((model) => ({
      value: model.getValue(),
      language: model.getLanguageId(),
      uri: model.uri.toString(),
    })),
  });

  const sessions = await db.getAll('sessions');
  if (sessions.length > MAX_SESSIONS) {
    await db.delete('sessions', sessions[0].id);
  }
}

export async function clearSavedModels() {
  const db = await initDB();
  await db.clear('sessions');
}

export async function loadSessions(): Promise<Session[]> {
  const db = await initDB();
  const sessions = await db.getAll('sessions');
  sessions.sort((a, b) => b.timestamp - a.timestamp);
  return sessions;
}
