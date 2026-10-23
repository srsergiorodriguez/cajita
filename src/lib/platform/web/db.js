import { openDB } from 'idb';

export const DB_NAME = 'cajita';
export const DB_VERSION = 1;

let dbPromise = null;

export function getDb() {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this environment');
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          const projects = db.createObjectStore('projects', { keyPath: 'id' });
          projects.createIndex('updatedAt', 'savedAt');
        }
        if (!db.objectStoreNames.contains('assets')) {
          const assets = db.createObjectStore('assets', { keyPath: 'key' });
          assets.createIndex('projectId', 'projectId');
        }
        if (!db.objectStoreNames.contains('thumbs')) {
          const thumbs = db.createObjectStore('thumbs', { keyPath: 'key' });
          thumbs.createIndex('projectId', 'projectId');
        }
        if (!db.objectStoreNames.contains('backups')) {
          const backups = db.createObjectStore('backups', { keyPath: 'key' });
          backups.createIndex('projectId', 'projectId');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      }
    });
  }
  return dbPromise;
}

export function assetKey(projectId, assetId) {
  return `${projectId}:${assetId}`;
}

export function backupKey(projectId, revision) {
  return `${projectId}:${String(revision).padStart(12, '0')}`;
}
