import { Octokit } from 'octokit';
import { loadConfig, saveConfig } from '../config';

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface DeviceTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface AuthenticatedUser {
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

export interface ProvisionResult {
  owner: string;
  repo: string;
  remoteUrl: string;
  pagesUrl: string;
  basePath: string;
  isNewRepo: boolean;
}

export function resolvePagesUrlAndBasePath(repoOwner: string, repoName: string): {
  isUserSite: boolean;
  basePath: string;
  pagesUrl: string;
} {
  const cleanOwner = repoOwner.trim().toLowerCase();
  const cleanRepo = repoName.trim();
  const isUserSite = cleanRepo.toLowerCase() === `${cleanOwner}.github.io`;
  const basePath = isUserSite ? '/' : `/${cleanRepo}`;
  const pagesUrl = isUserSite
    ? `https://${cleanOwner}.github.io/`
    : `https://${cleanOwner}.github.io/${cleanRepo}/`;

  return { isUserSite, basePath, pagesUrl };
}

export async function initiateDeviceFlow(clientId: string): Promise<DeviceCodeResponse> {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      scope: 'repo workflow',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to initiate GitHub device flow: ${errorText}`);
  }

  return (await response.json()) as DeviceCodeResponse;
}

export async function pollDeviceToken(
  clientId: string,
  deviceCode: string
): Promise<DeviceTokenResponse> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to poll GitHub device token: ${errorText}`);
  }

  return (await response.json()) as DeviceTokenResponse;
}

export async function verifyGitHubToken(token: string): Promise<AuthenticatedUser> {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.users.getAuthenticated();

  return {
    login: data.login,
    name: data.name ?? null,
    avatar_url: data.avatar_url,
    email: data.email ?? null,
  };
}

export async function provisionRepository(
  token: string,
  repoName: string,
  options?: { isPrivate?: boolean; description?: string }
): Promise<ProvisionResult> {
  const octokit = new Octokit({ auth: token });
  const user = await verifyGitHubToken(token);
  const owner = user.login;

  let isNewRepo = false;

  try {
    await octokit.rest.repos.get({ owner, repo: repoName });
  } catch (err: any) {
    if (err.status === 404) {
      await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        description: options?.description || 'Serverless Headless CMS Site',
        private: options?.isPrivate ?? false,
        auto_init: false,
      });
      isNewRepo = true;
    } else {
      throw err;
    }
  }

  const { isUserSite, basePath } = resolvePagesUrlAndBasePath(owner, repoName);
  let pagesUrl = isUserSite
    ? `https://${owner.toLowerCase()}.github.io/`
    : `https://${owner.toLowerCase()}.github.io/${repoName}/`;

  // Idempotent GitHub Pages configuration with build_type = 'workflow'
  try {
    const existingPages = await octokit.rest.repos.getPages({ owner, repo: repoName });
    if (existingPages.data.html_url) {
      pagesUrl = existingPages.data.html_url.endsWith('/')
        ? existingPages.data.html_url
        : `${existingPages.data.html_url}/`;
    }
    if (existingPages.data.build_type !== 'workflow') {
      try {
        await octokit.rest.repos.updateInformationAboutPagesSite({
          owner,
          repo: repoName,
          build_type: 'workflow',
        });
      } catch {}
    }
  } catch (err: any) {
    if (err.status === 404) {
      try {
        const createdPages = await octokit.rest.repos.createPagesSite({
          owner,
          repo: repoName,
          build_type: 'workflow',
        });
        if (createdPages.data.html_url) {
          pagesUrl = createdPages.data.html_url.endsWith('/')
            ? createdPages.data.html_url
            : `${createdPages.data.html_url}/`;
        }
      } catch (createErr: any) {
        if (createErr.status === 409) {
          try {
            await octokit.rest.repos.updateInformationAboutPagesSite({
              owner,
              repo: repoName,
              build_type: 'workflow',
            });
          } catch {}
        }
      }
    }
  }

  saveConfig({
    githubToken: token,
    repoOwner: owner,
    repoName,
    pagesUrl,
    basePath,
  });

  const remoteUrl = `https://github.com/${owner}/${repoName}.git`;

  return {
    owner,
    repo: repoName,
    remoteUrl,
    pagesUrl,
    basePath,
    isNewRepo,
  };
}

export async function triggerWorkflowDispatchIfNeeded(
  token: string,
  owner: string,
  repo: string,
  workflowId: string = 'deploy.yml',
  ref: string = 'main'
): Promise<boolean> {
  const octokit = new Octokit({ auth: token });
  try {
    // Brief delay to allow GitHub event webhook registration
    await new Promise((r) => setTimeout(r, 2000));

    const runs = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 5,
    });

    const hasActiveRun = runs.data.workflow_runs.some(
      (r) => r.status === 'queued' || r.status === 'in_progress'
    );

    if (!hasActiveRun) {
      await octokit.rest.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflowId,
        ref,
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[Workflow Trigger] Notice:', err);
    return false;
  }
}
