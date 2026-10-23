import { projectRepository } from './web/repository.js';
import {
  buildProjectBundle,
  bundleFileName,
  importProjectBundle,
  readProjectBundle
} from './web/bundle.js';
import { downloadBytes, pickFiles } from './web/files.js';
import { readCollectionZip } from './web/collection-zip.js';
import { createProjectLock } from './web/lock.js';
import { processFontFile, processMediaFile } from './web/media.js';
import {
  buildExportOptions,
  buildSiteZip,
  buildSingleFileExport,
  siteFileName
} from './web/site-export.js';
import {
  clearGithubToken,
  getGithubToken,
  getGithubTokenInfo,
  setGithubToken
} from './web/secrets.js';
import { publishToGithub, rollbackToGithub, unpublishFromGithub } from './web/github.js';

export const platform = {
  kind: 'web',
  projects: projectRepository,
  assets: {
    list: projectRepository.listAssets,
    get: projectRepository.getAsset,
    getThumb: projectRepository.getThumb,
    put: projectRepository.putAsset,
    remove: projectRepository.deleteAsset,
    usage: projectRepository.usage
  },
  files: {
    downloadBytes,
    pickFiles,
    readCollectionZip
  },
  site: {
    build: buildSiteZip,
    single: buildSingleFileExport,
    options: buildExportOptions,
    fileName: siteFileName
  },
  bundle: {
    build: buildProjectBundle,
    read: readProjectBundle,
    import: importProjectBundle,
    fileName: bundleFileName
  },
  locks: {
    create: createProjectLock
  },
  media: {
    process: processMediaFile,
    processFont: processFontFile
  },
  secrets: {
    getGithubToken,
    getGithubTokenInfo,
    setGithubToken,
    clearGithubToken
  },
  publisher: {
    publish: publishToGithub,
    unpublish: unpublishFromGithub,
    rollback: rollbackToGithub
  },
  async openExternal(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
