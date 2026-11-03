import React from 'react';
import {
  FileText,
  Layout,
  Image as ImageIcon,
  Settings,
  GitBranch,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import type { StudioTab, GitStatus, DeploymentStatus, UserConfig } from '../types';

interface TopbarProps {
  currentTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  gitStatus: GitStatus | null;
  deploymentStatus: DeploymentStatus | null;
  userConfig: UserConfig | null;
  onOpenPublish: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  onTabChange,
  gitStatus,
  deploymentStatus,
  userConfig,
  onOpenPublish,
}) => {
  const uncommittedCount =
    (gitStatus?.modified.length || 0) +
    (gitStatus?.not_added.length || 0) +
    (gitStatus?.created.length || 0) +
    (gitStatus?.deleted.length || 0);

  const latestRun = deploymentStatus?.latestRun;

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
      {/* Brand & Tabs */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-bold text-white text-sm">GC</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">GitCMS Studio</h1>
            <span className="text-[10px] text-slate-500 font-mono">Localhost:4000</span>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onTabChange('posts')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'posts'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Articles</span>
          </button>
          <button
            onClick={() => onTabChange('pages')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'pages'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Block Builder</span>
          </button>
          <button
            onClick={() => onTabChange('media')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'media'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Media Library</span>
          </button>
          <button
            onClick={() => onTabChange('settings')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'settings'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>GitHub &amp; API</span>
          </button>
        </nav>
      </div>

      {/* Right Status Actions */}
      <div className="flex items-center gap-3">
        {/* Repo & User Info */}
        {userConfig?.repoOwner && userConfig?.repoName && (
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="font-mono text-indigo-400">@{userConfig.repoOwner}</span>
            <span>/</span>
            <span className="text-white font-medium">{userConfig.repoName}</span>
            {userConfig.pagesUrl && (
              <a
                href={userConfig.pagesUrl}
                target="_blank"
                rel="noreferrer"
                className="text-slate-500 hover:text-indigo-400 transition-colors ml-1"
                title="Open Live GitHub Pages"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* CI/CD Status Badge */}
        {latestRun && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            {latestRun.status === 'in_progress' ? (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-amber-300 font-medium">CI Building...</span>
              </>
            ) : latestRun.conclusion === 'success' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Live Deployed</span>
              </>
            ) : latestRun.conclusion === 'failure' ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400 font-medium">Build Failed</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">CI {latestRun.status}</span>
              </>
            )}
          </div>
        )}

        {/* Git Local Status Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <GitBranch className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-slate-300">{gitStatus?.branch || 'main'}</span>
          <span>•</span>
          {uncommittedCount > 0 ? (
            <span className="text-amber-400 font-semibold">{uncommittedCount} changed</span>
          ) : (
            <span className="text-emerald-400">Clean</span>
          )}
        </div>

        {/* Publish Action Button */}
        <button
          onClick={onOpenPublish}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Publish</span>
        </button>
      </div>
    </header>
  );
};
