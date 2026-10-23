/**
 * These are documentation shapes, not a TypeScript build step. The app is
 * plain JavaScript; JSDoc is used only where a contract is worth naming.
 *
 * @typedef {'web' | 'desktop'} PlatformKind
 *
 * @typedef {Object} ProjectSummary
 * @property {string} id
 * @property {string} title
 * @property {number} updatedAt
 *
 * @typedef {Object} ProjectRepository
 * @property {() => Promise<ProjectSummary[]>} list
 * @property {(id: string) => Promise<object | null>} load
 * @property {(project: object) => Promise<void>} save
 * @property {(id: string) => Promise<void>} remove
 *
 * @typedef {Object} AssetRepository
 * @property {(id: string, blob: Blob) => Promise<void>} put
 * @property {(id: string) => Promise<Blob | null>} get
 * @property {(id: string) => Promise<void>} remove
 * @property {() => Promise<{bytes: number, count: number}>} usage
 *
 * @typedef {Object} SaveResult
 * @property {boolean} ok
 * @property {string} [path]
 *
 * @typedef {Object} FileGateway
 * @property {(name: string, bytes: Uint8Array) => Promise<SaveResult>} saveBundle
 * @property {() => Promise<{name: string, bytes: Uint8Array} | null>} openBundle
 * @property {(name: string, bytes: Uint8Array) => Promise<SaveResult>} exportZip
 *
 * @typedef {Object} SecretStore
 * @property {() => Promise<string | null>} getGithubToken
 * @property {(token: string, persist: boolean) => Promise<void>} setGithubToken
 * @property {() => Promise<void>} clearGithubToken
 *
 * @typedef {Object} PublishTransport
 * @property {(input: object) => Promise<object>} request
 *
 * @typedef {Object} Platform
 * @property {PlatformKind} kind
 * @property {ProjectRepository} projects
 * @property {AssetRepository} assets
 * @property {FileGateway} files
 * @property {SecretStore} secrets
 * @property {PublishTransport} publisher
 * @property {(url: string) => Promise<void>} openExternal
 */

export const PLATFORM = Object.freeze({
  WEB: 'web',
  DESKTOP: 'desktop'
});

export const ERROR_CODES = Object.freeze({
  STORAGE_QUOTA: 'STORAGE_QUOTA',
  IMPORT_INVALID: 'IMPORT_INVALID',
  ASSET_UNSUPPORTED: 'ASSET_UNSUPPORTED',
  ASSET_TOO_LARGE: 'ASSET_TOO_LARGE',
  EXPORT_EMPTY: 'EXPORT_EMPTY',
  EXPORT_WRITE: 'EXPORT_WRITE',
  PUBLISH_AUTH: 'PUBLISH_AUTH',
  PUBLISH_PERMISSION: 'PUBLISH_PERMISSION',
  PUBLISH_CONFLICT: 'PUBLISH_CONFLICT',
  NETWORK: 'NETWORK',
  CANCELLED: 'CANCELLED',
  INTERNAL: 'INTERNAL'
});

/**
 * In-memory platform for tests and the development shell. It is deliberately
 * boring: no IndexedDB, no filesystem, no network.
 *
 * @returns {Platform}
 */
export function createFakePlatform() {
  const projects = new Map();
  const assets = new Map();
  let token = null;

  return {
    kind: PLATFORM.WEB,
    projects: {
      async list() {
        return [...projects.values()].map((project) => ({
          id: project.id,
          title: project.title,
          updatedAt: project.updatedAt ?? 0
        }));
      },
      async load(id) {
        return projects.get(id) ?? null;
      },
      async save(project) {
        projects.set(project.id, {
          ...project,
          updatedAt: Date.now()
        });
      },
      async remove(id) {
        projects.delete(id);
      }
    },
    assets: {
      async put(id, blob) {
        assets.set(id, blob);
      },
      async get(id) {
        return assets.get(id) ?? null;
      },
      async remove(id) {
        assets.delete(id);
      },
      async usage() {
        let bytes = 0;
        for (const blob of assets.values()) bytes += blob.size ?? 0;
        return { bytes, count: assets.size };
      }
    },
    files: {
      async saveBundle(name) {
        return { ok: true, path: name };
      },
      async openBundle() {
        return null;
      },
      async exportZip(name) {
        return { ok: true, path: name };
      }
    },
    secrets: {
      async getGithubToken() {
        return token;
      },
      async setGithubToken(value) {
        token = value;
      },
      async clearGithubToken() {
        token = null;
      }
    },
    publisher: {
      async request() {
        return { ok: true };
      }
    },
    async openExternal() {}
  };
}
