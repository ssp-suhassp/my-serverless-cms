import type {
  PostItem,
  PageData,
  GitStatus,
  DeploymentStatus,
  MediaFile,
  UserConfig,
  PostFrontmatter,
} from './types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch('/health');
  return res.json();
}

export async function fetchAuthUser(): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/user`);
  return res.json();
}

export async function verifyToken(token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return res.json();
}

export async function requestDeviceCode(clientId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/device-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId }),
  });
  return res.json();
}

export async function pollDeviceCode(clientId: string, deviceCode: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/poll-device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, deviceCode }),
  });
  return res.json();
}

export async function fetchConfig(): Promise<UserConfig> {
  const res = await fetch(`${API_BASE}/setup/config`);
  return res.json();
}

export async function saveConfig(updates: Partial<UserConfig>): Promise<any> {
  const res = await fetch(`${API_BASE}/setup/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function provisionRepository(payload: {
  repoName: string;
  isPrivate?: boolean;
  description?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/setup/provision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchPosts(): Promise<PostItem[]> {
  const res = await fetch(`${API_BASE}/posts`);
  const data = await res.json();
  return data.posts || [];
}

export async function fetchPost(slug: string): Promise<PostItem> {
  const res = await fetch(`${API_BASE}/posts/${slug}`);
  return res.json();
}

export async function savePost(payload: {
  frontmatter: PostFrontmatter;
  body?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data;
}

export async function deletePost(slug: string): Promise<any> {
  const res = await fetch(`${API_BASE}/posts/${slug}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function fetchPages(): Promise<PageData[]> {
  const res = await fetch(`${API_BASE}/pages`);
  const data = await res.json();
  return data.pages || [];
}

export async function fetchPage(slug: string): Promise<PageData> {
  const res = await fetch(`${API_BASE}/pages/${slug}`);
  return res.json();
}

export async function savePage(page: PageData): Promise<any> {
  const res = await fetch(`${API_BASE}/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(page),
  });
  const data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data;
}

export async function deletePage(slug: string): Promise<any> {
  const res = await fetch(`${API_BASE}/pages/${slug}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function fetchMedia(): Promise<MediaFile[]> {
  const res = await fetch(`${API_BASE}/media`);
  const data = await res.json();
  return data.files || [];
}

export async function uploadMedia(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/media/upload`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function deleteMedia(filename: string): Promise<any> {
  const res = await fetch(`${API_BASE}/media/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function cleanupOrphanMedia(): Promise<{ removedCount: number; removedFiles: string[] }> {
  const res = await fetch(`${API_BASE}/media/cleanup-orphans`, {
    method: 'POST',
  });
  return res.json();
}

export async function fetchGitStatus(): Promise<GitStatus> {
  const res = await fetch(`${API_BASE}/git/status`);
  return res.json();
}

export async function publishGit(message?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/git/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data;
}

export async function syncGit(): Promise<any> {
  const res = await fetch(`${API_BASE}/git/sync`, {
    method: 'POST',
  });
  return res.json();
}

export async function fetchDeploymentStatus(): Promise<DeploymentStatus> {
  const res = await fetch(`${API_BASE}/git/deployment-status`);
  return res.json();
}

export async function fetchGitHistory(): Promise<{
  commits: Array<{
    hash: string;
    shortHash: string;
    message: string;
    author_name: string;
    date: string;
  }>;
}> {
  const res = await fetch(`${API_BASE}/git/history`);
  return res.json();
}

export async function rollbackGitContent(commitHash: string): Promise<{
  success: boolean;
  commitHash: string;
  restoredTo: string;
  newCommitHash: string;
}> {
  const res = await fetch(`${API_BASE}/git/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commitHash }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data;
}

