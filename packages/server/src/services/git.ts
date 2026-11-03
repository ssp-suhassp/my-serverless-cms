import { simpleGit, type StatusResult } from 'simple-git';
import { Octokit } from 'octokit';
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

export async function getGitStatus(): Promise<GitEngineStatus> {
  const remotes = await git.getRemotes(true);
  const hasOrigin = remotes.some((r) => r.name === 'origin');

  if (hasOrigin) {
    try {
      await git.fetch(['origin', 'main']);
    } catch {}
  }

  const status: StatusResult = await git.status();

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
  const commitMessage = message || `chore(cms): publish content - ${new Date().toISOString()}`;

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
    throw new Error('Missing GitHub credentials or repository configuration in .cms-config.json');
  }

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
}
