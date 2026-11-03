import { simpleGit, type StatusResult } from 'simple-git';
import { Octokit } from 'octokit';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { PATHS, loadConfig, saveConfig } from '../config';

const git = simpleGit(PATHS.root);

export interface GitEngineStatus {
  isClean: boolean;
  branch: string;
  ahead: number;
  behind: number;
  diverged: boolean;
  modified: string[];
  not_added: string[];
  created: string[];
  deleted: string[];
  staged: string[];
  hasRemote: boolean;
  suggestedMessage: string;
}

export interface PublishResult {
  success: boolean;
  commitHash: string;
  commitMessage: string;
  timestamp: string;
  pushed: boolean;
}

export interface DeploymentStatusResult {
  latestRun: {
    id: number;
    name: string | null;
    status: string | null;
    conclusion: string | null;
    html_url: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  totalRuns: number;
}

export interface GitCommitEntry {
  hash: string;
  shortHash: string;
  message: string;
  author_name: string;
  date: string;
}

export interface RollbackResult {
  success: boolean;
  commitHash: string;
  restoredTo: string;
  newCommitHash: string;
}

export async function syncRemote(): Promise<{ success: boolean; message: string }> {
  const remotes = await git.getRemotes(true);
  const originRemote = remotes.find((r) => r.name === 'origin');
  if (!originRemote) {
    return { success: true, message: 'No remote origin configured. Local workspace is current.' };
  }

  try {
    await git.pull('origin', 'main', { '--rebase': 'true' });
    return { success: true, message: 'Successfully synced and rebased against origin/main.' };
  } catch (err: any) {
    throw new Error(`Sync failed: ${err.message}`);
  }
}

export function detectContextualCommitMessage(files: string[]): string {
  const postFiles = files.filter((f) => (f.includes('content/posts/') || f.includes('content\\posts\\')) && f.endsWith('.md'));
  const pageFiles = files.filter((f) => (f.includes('content/pages/') || f.includes('content\\pages\\')) && f.endsWith('.json'));
  const mediaFiles = files.filter((f) => f.includes('public/uploads/') || f.includes('public\\uploads\\') || f.includes('/uploads/'));

  if (postFiles.length === 1 && pageFiles.length === 0 && mediaFiles.length === 0) {
    const postRelPath = postFiles[0];
    const postFullPath = path.isAbsolute(postRelPath)
      ? postRelPath
      : path.join(PATHS.root, postRelPath);

    if (fs.existsSync(postFullPath)) {
      try {
        const raw = fs.readFileSync(postFullPath, 'utf-8');
        const parsed = matter(raw);
        const title = parsed.data.title || path.basename(postRelPath, '.md');
        if (parsed.data.draft) {
          return `draft(post): update "${title}"`;
        }
        return `publish(post): "${title}"`;
      } catch {
        const title = path.basename(postRelPath, '.md');
        return `publish(post): "${title}"`;
      }
    }
    const title = path.basename(postRelPath, '.md');
    return `publish(post): "${title}"`;
  }

  if (postFiles.length > 1 && pageFiles.length === 0 && mediaFiles.length === 0) {
    return `content(posts): update ${postFiles.length} articles`;
  }

  if (pageFiles.length === 1 && postFiles.length === 0 && mediaFiles.length === 0) {
    const slug = path.basename(pageFiles[0], '.json');
    return `layout(pages): update "${slug}" blocks`;
  }

  if (pageFiles.length > 1 && postFiles.length === 0 && mediaFiles.length === 0) {
    return `layout(pages): update ${pageFiles.length} pages`;
  }

  if (mediaFiles.length === 1 && postFiles.length === 0 && pageFiles.length === 0) {
    const filename = path.basename(mediaFiles[0]);
    return `asset(media): upload ${filename} (transcoded WebP)`;
  }

  if (mediaFiles.length > 1 && postFiles.length === 0 && pageFiles.length === 0) {
    return `asset(media): upload ${mediaFiles.length} media assets (transcoded WebP)`;
  }

  if (postFiles.length > 0 || pageFiles.length > 0 || mediaFiles.length > 0) {
    return 'chore(content): sync published articles and media updates';
  }

  return 'chore(cms): sync local updates';
}

export async function getGitStatus(): Promise<GitEngineStatus> {
  const remotes = await git.getRemotes(true);
  const hasOrigin = remotes.some((r) => r.name === 'origin');

  if (hasOrigin) {
    try {
      await git.fetch(['origin', 'main']);
    } catch {}
  }

  const status: StatusResult = await git.status();
  const allChangedFiles = [
    ...status.staged,
    ...status.modified,
    ...status.created,
    ...status.not_added,
    ...status.deleted,
  ];
  const suggestedMessage = detectContextualCommitMessage(allChangedFiles);

  return {
    isClean: status.isClean(),
    branch: status.current || 'main',
    ahead: status.ahead,
    behind: status.behind,
    diverged: status.behind > 0,
    modified: status.modified,
    not_added: status.not_added,
    created: status.created,
    deleted: status.deleted,
    staged: status.staged,
    hasRemote: hasOrigin,
    suggestedMessage,
  };
}

export async function publishContent(message?: string): Promise<PublishResult> {
  const remotes = await git.getRemotes(true);
  const originRemote = remotes.find((r) => r.name === 'origin');
  const config = loadConfig();

  if (originRemote) {
    try {
      await git.fetch(['origin', 'main']);
    } catch {}

    const statusBefore = await git.status();
    if (statusBefore.behind > 0) {
      const err: any = new Error(
        `Remote repository has ${statusBefore.behind} newer commit(s). Pull or rebase before publishing.`
      );
      err.statusCode = 409;
      err.behind = statusBefore.behind;
      throw err;
    }
  }

  await git.add([
    'packages/site-template/src/content/',
    'packages/site-template/public/uploads/',
  ]);

  const currentStatus = await git.status();
  let commitMessage = message?.trim();
  if (!commitMessage) {
    commitMessage = detectContextualCommitMessage(currentStatus.staged);
  }

  let commitHash: string;

  if (currentStatus.staged.length > 0) {
    const commitResult = await git.commit(commitMessage);
    commitHash = commitResult.commit || (await git.revparse(['HEAD']));
  } else {
    commitHash = await git.revparse(['HEAD']);
  }

  let pushed = false;

  if (originRemote && config.githubToken && config.repoOwner && config.repoName) {
    const authenticatedUrl = `https://x-access-token:${config.githubToken}@github.com/${config.repoOwner}/${config.repoName}.git`;
    try {
      await git.push(authenticatedUrl, 'main');
      pushed = true;
    } catch (pushErr) {
      await git.push('origin', 'main').catch(() => {});
    }
  }

  saveConfig({
    lastSyncedCommit: commitHash,
  });

  return {
    success: true,
    commitHash,
    commitMessage,
    timestamp: new Date().toISOString(),
    pushed,
  };
}

export async function getDeploymentStatus(): Promise<DeploymentStatusResult> {
  const config = loadConfig();
  if (!config.githubToken || !config.repoOwner || !config.repoName) {
    return {
      latestRun: null,
      totalRuns: 0,
    };
  }

  try {
    const octokit = new Octokit({ auth: config.githubToken });

    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner: config.repoOwner,
      repo: config.repoName,
      per_page: 5,
    });

    const latest = data.workflow_runs[0];

    return {
      latestRun: latest
        ? {
            id: latest.id,
            name: latest.name ?? null,
            status: latest.status ?? null,
            conclusion: latest.conclusion ?? null,
            html_url: latest.html_url,
            createdAt: latest.created_at,
            updatedAt: latest.updated_at,
          }
        : null,
      totalRuns: data.total_count,
    };
  } catch {
    return {
      latestRun: null,
      totalRuns: 0,
    };
  }
}

export async function getCommitHistory(maxCount = 20): Promise<GitCommitEntry[]> {
  try {
    const logResult = await git.log({ maxCount });
    return logResult.all.map((c) => ({
      hash: c.hash,
      shortHash: c.hash.substring(0, 7),
      message: c.message,
      author_name: c.author_name || c.author_email || 'Author',
      date: c.date,
    }));
  } catch {
    return [];
  }
}

export async function rollbackContent(commitHash: string): Promise<RollbackResult> {
  if (!/^[a-fA-F0-9]{4,40}$/.test(commitHash)) {
    throw new Error('Invalid commit hash provided for rollback.');
  }

  const contentRelPath = 'packages/site-template/src/content';
  await git.checkout([commitHash, '--', contentRelPath]);
  await git.add(contentRelPath);

  const status = await git.status();
  const shortHash = commitHash.substring(0, 7);

  let newCommitHash = commitHash;
  if (status.staged.length > 0) {
    const commitMsg = `chore(cms): rollback content to ${shortHash}`;
    const commitResult = await git.commit(commitMsg);
    newCommitHash = commitResult.commit;
  }

  return {
    success: true,
    commitHash,
    restoredTo: shortHash,
    newCommitHash,
  };
}
