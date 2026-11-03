import type {
  PostFrontmatter,
  PageBlock,
  PageData,
  HeroBlock,
  FeaturesBlock,
  RichTextBlock,
  CtaBlock,
  FeatureItem,
} from '@cms/shared';

export type {
  PostFrontmatter,
  PageBlock,
  PageData,
  HeroBlock,
  FeaturesBlock,
  RichTextBlock,
  CtaBlock,
  FeatureItem,
};

export type StudioTab = 'posts' | 'pages' | 'media' | 'history' | 'settings';

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author_name: string;
  date: string;
}

export interface RollbackResponse {
  success: boolean;
  commitHash: string;
  restoredTo: string;
  newCommitHash: string;
}

export interface PostItem {
  slug: string;
  frontmatter: PostFrontmatter;
  body: string;
  filePath?: string;
}

export interface GitStatus {
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

export interface DeploymentStatus {
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

export interface MediaFile {
  filename: string;
  url: string;
  size: number;
  createdAt: string;
}

export interface UserConfig {
  githubToken?: string;
  repoOwner?: string;
  repoName?: string;
  siteTitle?: string;
  basePath?: string;
  pagesUrl?: string;
  lastSyncedCommit?: string;
  hasToken?: boolean;
}

