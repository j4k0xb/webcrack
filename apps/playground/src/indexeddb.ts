import { openDB, type DBSchema } from 'idb';
import type * as monaco from 'monaco-editor';
import { createSignal } from 'solid-js';

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

const [sessions, setSessions] = createSignal<Session[]>([]);
loadSessions().then(setSessions).catch(console.error);

export function useSessions() {
  return { sessions, saveModels };
}

async function saveModels(models: monaco.editor.ITextModel[]) {
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
  setSessions(sessions.slice(0, 10));
}

async function loadSessions(): Promise<Session[]> {
  const db = await initDB();
  const sessions = await db.getAll('sessions');
  sessions.sort((a, b) => b.timestamp - a.timestamp);
  return sessions;
}
