import { openDB, type DBSchema } from 'idb';
import type * as monaco from 'monaco-editor';
import { createSignal } from 'solid-js';

let workspaceId = Math.random().toString(36).slice(2);
const MAX_WORKSPACES = 10;

export interface Workspace {
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
  workspaces: {
    key: string;
    value: Workspace;
  };
}

async function initDB() {
  return openDB<MyDB>('workspaces', 1, {
    upgrade(db) {
      db.createObjectStore('workspaces', { keyPath: 'id' });
    },
  });
}

const [workspaces, setWorkspaces] = createSignal<Workspace[]>([]);
loadWorkspaces().then(setWorkspaces).catch(console.error);

export function useWorkspaces() {
  return { workspaces, saveModels, setWorkspaceId };
}

function setWorkspaceId(id: string) {
  workspaceId = id;
}

async function saveModels(models: monaco.editor.ITextModel[]) {
  const db = await initDB();
  await db.put('workspaces', {
    id: workspaceId,
    timestamp: Date.now(),
    models: models.map((model) => ({
      value: model.getValue(),
      language: model.getLanguageId(),
      uri: model.uri.toString(),
    })),
  });

  const workspaces = await db.getAll('workspaces');
  if (workspaces.length > MAX_WORKSPACES) {
    await db.delete('workspaces', workspaces[0].id);
  }
  setWorkspaces(workspaces.slice(0, 10));
}

async function loadWorkspaces(): Promise<Workspace[]> {
  const db = await initDB();
  const workspaces = await db.getAll('workspaces');
  workspaces.sort((a, b) => b.timestamp - a.timestamp);
  return workspaces;
}
