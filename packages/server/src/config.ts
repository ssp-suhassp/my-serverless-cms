import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

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
  envTest: path.join(ROOT_DIR, 'References', '.env-test'),
  posts: path.join(ROOT_DIR, 'packages', 'site-template', 'src', 'content', 'posts'),
  pages: path.join(ROOT_DIR, 'packages', 'site-template', 'src', 'content', 'pages'),
  uploads: path.join(ROOT_DIR, 'packages', 'site-template', 'public', 'uploads'),
};

export function extractCredentialsFromEnvTest(): { token?: string; owner?: string } {
  if (!fs.existsSync(PATHS.envTest)) {
    return {};
  }

  try {
    const content = fs.readFileSync(PATHS.envTest, 'utf-8');
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    let token: string | undefined;
    let owner: string | undefined;

    for (const line of lines) {
      if (/^(gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)/.test(line)) {
        token = line;
      } else if (line.includes('github.com/')) {
        const match = line.match(/github\.com\/([a-zA-Z0-9_-]+)/);
        if (match) {
          owner = match[1];
        }
      } else if (line.startsWith('GITHUB_TOKEN=') || line.startsWith('GITHUB_PAT=')) {
        token = line.split('=')[1]?.trim();
      } else if (line.startsWith('REPO_OWNER=')) {
        owner = line.split('=')[1]?.trim();
      }
    }

    return { token, owner };
  } catch {
    return {};
  }
}

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

  const envCredentials = extractCredentialsFromEnvTest();
  const token =
    fileConfig.githubToken ||
    process.env.GITHUB_TOKEN ||
    process.env.GITHUB_PAT ||
    envCredentials.token;

  const owner =
    fileConfig.repoOwner ||
    process.env.REPO_OWNER ||
    envCredentials.owner;

  return {
    ...defaults,
    ...fileConfig,
    githubToken: token,
    repoOwner: owner,
  };
}

export function saveConfig(updates: Partial<CMSConfig>): CMSConfig {
  const current = loadConfig();
  const merged: CMSConfig = {
    ...current,
    ...updates,
  };

  fs.writeFileSync(PATHS.config, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

export function getEffectiveToken(): string | undefined {
  return loadConfig().githubToken;
}

