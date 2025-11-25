import { openDB, DBSchema } from 'idb';
import { Project, ProjectMetadata, LogEntry } from '../types';

interface RunnerDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-date': number };
  };
  logs: {
    key: string;
    value: LogEntry;
    indexes: { 'by-project': string, 'by-date': number };
  };
}

const DB_NAME = 'nexus-runner-db';
const DB_VERSION = 2;

const dbPromise = openDB<RunnerDB>(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion, newVersion, transaction) {
    if (oldVersion < 1) {
      const store = db.createObjectStore('projects', { keyPath: 'id' });
      store.createIndex('by-date', 'createdAt');
    }
    if (oldVersion < 2) {
      const logStore = db.createObjectStore('logs', { keyPath: 'id' });
      logStore.createIndex('by-project', 'projectId');
      logStore.createIndex('by-date', 'timestamp');
    }
  },
});

export async function saveProject(project: Project): Promise<void> {
  const db = await dbPromise;
  await db.put('projects', project);
}

export async function updateProject(project: Project): Promise<void> {
  const db = await dbPromise;
  await db.put('projects', project);
}

export async function toggleProjectPin(id: string): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction('projects', 'readwrite');
  const store = tx.objectStore('projects');
  const project = await store.get(id);
  if (project) {
    project.isPinned = !project.isPinned;
    await store.put(project);
  }
  await tx.done;
}

export async function getAllProjects(): Promise<ProjectMetadata[]> {
  const db = await dbPromise;
  const projects = await db.getAllFromIndex('projects', 'by-date');
  return projects.map(({ id, name, description, createdAt, type, thumbnail, entryPoint, externalUrl, settings, isPinned }) => ({
    id, name, description, createdAt, type, thumbnail, entryPoint, externalUrl, settings, isPinned
  })).reverse();
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await dbPromise;
  return db.get('projects', id);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await dbPromise;
  // Also delete logs
  const tx = db.transaction(['projects', 'logs'], 'readwrite');
  await tx.objectStore('projects').delete(id);
  const logIndex = tx.objectStore('logs').index('by-project');
  let cursor = await logIndex.openKeyCursor(IDBKeyRange.only(id));
  while (cursor) {
    await db.delete('logs', cursor.primaryKey);
    cursor = await cursor.continue();
  }
  await tx.done;
}

// Log / Diary Methods
export async function addLog(log: LogEntry): Promise<void> {
  const db = await dbPromise;
  await db.put('logs', log);
}

export async function getProjectLogs(projectId: string): Promise<LogEntry[]> {
  const db = await dbPromise;
  return db.getAllFromIndex('logs', 'by-project', projectId);
}

export async function clearProjectLogs(projectId: string): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction('logs', 'readwrite');
  const index = tx.store.index('by-project');
  let cursor = await index.openCursor(IDBKeyRange.only(projectId));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}