import { assetKey, backupKey, getDb } from './db.js';
import { projectStats } from '../../domain/model.js';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function summaryFromRow(row) {
  const stats = projectStats(row.project);
  return {
    id: row.id,
    title: row.project.title,
    slug: row.project.slug,
    locale: row.project.locale,
    pages: stats.pages,
    assets: stats.assets,
    media: stats.media,
    fonts: stats.fonts,
    bytes: stats.bytes,
    savedAt: row.savedAt,
    revision: row.revision ?? 0,
    theme: row.project.theme?.name ?? 'papel',
    stageWidth: row.project.stage?.width ?? 1200,
    stageHeight: row.project.stage?.height ?? 800
  };
}

export const projectRepository = {
  async list() {
    const db = await getDb();
    const rows = await db.getAll('projects');
    return rows
      .map((row) => {
        try {
          return summaryFromRow(row);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  },

  async load(id) {
    const db = await getDb();
    const row = await db.get('projects', id);
    return row
      ? { project: row.project, savedAt: row.savedAt, revision: row.revision }
      : null;
  },

  async save(project, { revision = 0, backup = true } = {}) {
    const db = await getDb();
    const plain = clone(project);
    const savedAt = Date.now();
    const tx = db.transaction(['projects', 'backups'], 'readwrite');
    await tx.objectStore('projects').put({
      id: plain.id,
      project: plain,
      savedAt,
      revision
    });

    if (backup) {
      await tx.objectStore('backups').put({
        key: backupKey(plain.id, revision),
        projectId: plain.id,
        project: plain,
        savedAt,
        revision
      });
      const backupStore = tx.objectStore('backups');
      const index = backupStore.index('projectId');
      const rows = await index.getAll(plain.id);
      rows.sort((a, b) => (b.revision ?? 0) - (a.revision ?? 0));
      for (const old of rows.slice(3)) {
        await backupStore.delete(old.key);
      }
    }

    await tx.done;
    return { savedAt, revision };
  },

  async remove(id) {
    const db = await getDb();
    const tx = db.transaction(['projects', 'assets', 'thumbs', 'backups'], 'readwrite');
    const assetKeys = await tx.objectStore('assets').index('projectId').getAllKeys(id);
    const thumbKeys = await tx.objectStore('thumbs').index('projectId').getAllKeys(id);
    const backupKeys = await tx.objectStore('backups').index('projectId').getAllKeys(id);
    for (const key of assetKeys) await tx.objectStore('assets').delete(key);
    for (const key of thumbKeys) await tx.objectStore('thumbs').delete(key);
    for (const key of backupKeys) await tx.objectStore('backups').delete(key);
    await tx.objectStore('projects').delete(id);
    await tx.done;
  },

  async listBackups(projectId) {
    const db = await getDb();
    const rows = await db.getAllFromIndex('backups', 'projectId', projectId);
    return rows.sort((a, b) => (b.revision ?? 0) - (a.revision ?? 0));
  },

  async putAsset(projectId, meta, blob, thumb, thumbHash) {
    const db = await getDb();
    const key = assetKey(projectId, meta.id);
    const tx = db.transaction(['assets', 'thumbs'], 'readwrite');
    await tx.objectStore('assets').put({ key, projectId, meta, blob });
    if (thumb) {
      await tx.objectStore('thumbs').put({
        key,
        projectId,
        blob: thumb,
        hash: thumbHash
      });
    }
    await tx.done;
  },

  async listAssets(projectId) {
    const db = await getDb();
    const rows = await db.getAllFromIndex('assets', 'projectId', projectId);
    return rows.map((row) => row.meta);
  },

  async getAsset(projectId, assetId) {
    const db = await getDb();
    return db.get('assets', assetKey(projectId, assetId));
  },

  async getThumb(projectId, assetId) {
    const db = await getDb();
    return db.get('thumbs', assetKey(projectId, assetId));
  },

  async deleteAsset(projectId, assetId) {
    const db = await getDb();
    const key = assetKey(projectId, assetId);
    const tx = db.transaction(['assets', 'thumbs'], 'readwrite');
    await tx.objectStore('assets').delete(key);
    await tx.objectStore('thumbs').delete(key);
    await tx.done;
  },

  async usage() {
    const db = await getDb();
    const projects = await db.getAll('projects');
    let bytes = 0;
    for (const row of projects) bytes += projectStats(row.project).bytes;
    return { bytes, projects: projects.length };
  },

  async saveSetting(key, value) {
    const db = await getDb();
    await db.put('settings', { key, value });
  },

  async getSetting(key) {
    const db = await getDb();
    const row = await db.get('settings', key);
    return row?.value ?? null;
  },

  async importProject(project, assets, thumbs = {}) {
    const db = await getDb();
    const plain = clone(project);
    const tx = db.transaction(['projects', 'assets', 'thumbs', 'backups'], 'readwrite');
    const savedAt = Date.now();
    await tx.objectStore('projects').put({
      id: plain.id,
      project: plain,
      savedAt,
      revision: 1
    });
    for (const asset of assets) {
      const key = assetKey(plain.id, asset.meta.id);
      await tx.objectStore('assets').put({
        key,
        projectId: plain.id,
        meta: asset.meta,
        blob: asset.blob
      });
      if (asset.thumb) {
        await tx.objectStore('thumbs').put({
          key,
          projectId: plain.id,
          blob: asset.thumb,
          hash: asset.thumbHash
        });
      }
    }
    await tx.objectStore('backups').put({
      key: backupKey(plain.id, 1),
      projectId: plain.id,
      project: plain,
      savedAt,
      revision: 1
    });
    await tx.done;
    return { savedAt, revision: 1 };
  }
};
