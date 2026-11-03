import fs from 'node:fs';
import path from 'node:path';

export interface CMSConfig {
  githubToken?: string;
  repoOwner?: string;
  repoName?: string;
  siteTitle?: string;
  basePath?: string;
  pagesUrl?: string;
  lastSyncedCommit?: string;
}

export function findWorkspaceRoot(startDir: string = process.cwd()): string {
  let curr = path.resolve(startDir);
  while (curr !== path.dirname(curr)) {
    const pkgPath = path.join(curr, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.workspaces) {
          return curr;
        }
      } catch {}
    }
    curr = path.dirname(curr);
  }
  return process.cwd();
}

const ROOT_DIR = findWorkspaceRoot();

export const PATHS = {
  root: ROOT_DIR,
  config: path.join(ROOT_DIR, '.cms-config.json'),
  posts: path.join(ROOT_DIR, 'packages', 'site-template', 'src', 'content', 'posts'),
  pages: path.join(ROOT_DIR, 'packages', 'site-template', 'src', 'content', 'pages'),
  uploads: path.join(ROOT_DIR, 'packages', 'site-template', 'public', 'uploads'),
};

export function loadConfig(): CMSConfig {
  const defaults: CMSConfig = {
    siteTitle: 'My Serverless CMS Site',
    basePath: '/',
  };

  let fileConfig: CMSConfig = {};
  if (fs.existsSync(PATHS.config)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(PATHS.config, 'utf-8'));
    } catch {
      fileConfig = {};
    }
  }

  return {
    ...defaults,
    ...fileConfig,
  };
}

export const readConfig = loadConfig;

export function saveConfig(updates: Partial<CMSConfig>): CMSConfig {
  const current = loadConfig();
  const merged: CMSConfig = {
    ...current,
    ...updates,
  };

  fs.writeFileSync(PATHS.config, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

export function clearConfig(): void {
  if (fs.existsSync(PATHS.config)) {
    try {
      fs.unlinkSync(PATHS.config);
    } catch {}
  }
}

export function getEffectiveToken(): string | undefined {
  return loadConfig().githubToken;
}
