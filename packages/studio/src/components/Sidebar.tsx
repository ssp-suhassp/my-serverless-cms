import React from 'react';
import {
  FileText,
  Layout,
  Image as ImageIcon,
  Settings,
  History,
  ExternalLink,
  GitBranch,
  Circle,
  UploadCloud,
  LogOut,
  ArrowUpRight,
  Globe,
} from 'lucide-react';
import type { StudioTab, GitStatus, UserConfig, DeploymentStatus } from '../types';

interface SidebarProps {
  currentTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  userConfig: UserConfig | null;
  gitStatus: GitStatus | null;
  deploymentStatus?: DeploymentStatus | null;
  onOpenHistory: () => void;
  onOpenPublish: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  userConfig,
  gitStatus,
  deploymentStatus,
  onOpenHistory,
  onOpenPublish,
  onLogout,
}) => {
  const uncommittedCount =
    (gitStatus?.modified.length || 0) +
    (gitStatus?.not_added.length || 0) +
    (gitStatus?.created.length || 0) +
    (gitStatus?.deleted.length || 0);

  const navItems: Array<{ tab: StudioTab; label: string; icon: React.ElementType }> = [
    { tab: 'posts', label: 'Posts', icon: FileText },
    { tab: 'pages', label: 'Pages', icon: Layout },
    { tab: 'media', label: 'Media', icon: ImageIcon },
    { tab: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#14171c] border-r border-zinc-800/80 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
            <span className="font-serif font-black text-sm text-zinc-950">G</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-semibold text-zinc-100 truncate">
              {userConfig?.siteTitle || 'GitCMS Studio'}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-zinc-400 font-mono">
                {userConfig?.repoOwner ? `@${userConfig.repoOwner}` : 'Localhost'}
              </span>
            </div>
          </div>
        </div>

        {userConfig?.pagesUrl && (
          <a
            href={userConfig.pagesUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Open Live GitHub Pages"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Live Site & Status Bar */}
      {userConfig?.pagesUrl && (
        <div className="px-3 pt-3">
          {deploymentStatus?.liveStatus === 'deploying' ||
          deploymentStatus?.latestRun?.status === 'in_progress' ||
          deploymentStatus?.latestRun?.status === 'queued' ? (
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className="font-medium text-[11px] truncate">Deploying github.io...</span>
              </div>
              {deploymentStatus?.latestRun?.html_url && (
                <a
                  href={deploymentStatus.latestRun.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:text-white shrink-0 ml-1"
                  title="View GitHub Actions Run"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ) : deploymentStatus?.liveStatus === 'online' ? (
            <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <a
                  href={userConfig.pagesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] truncate"
                  title="Open Live Website on github.io"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">Live on github.io</span>
                  <ArrowUpRight className="w-3 h-3 shrink-0" />
                </a>
                <a
                  href={`${userConfig.pagesUrl.replace(/\/+$/, '')}/api/posts.json`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  title="Open Headless JSON API"
                >
                  API
                </a>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                <span>github.io ready</span>
              </span>
              <a
                href={userConfig.pagesUrl}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-400 hover:text-zinc-200"
                title="Open Live Site"
              >
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Navigation Links */}
      <nav className="p-2 space-y-0.5 flex-1">
        <div className="px-3 py-2 text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
          Content &amp; Site
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => onTabChange(item.tab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-100' : 'text-zinc-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="pt-4 px-3 py-2 text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
          Version Control
        </div>

        <button
          onClick={onOpenHistory}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
        >
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-zinc-500" />
            <span>Commit History</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
            Rollback
          </span>
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 mt-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-red-950/20 transition-all"
            title="Sign out and return to GitHub login screen"
          >
            <LogOut className="w-4 h-4 text-zinc-500" />
            <span>Sign Out</span>
          </button>
        )}
      </nav>

      {/* Git Publish Bar */}
      <div className="p-3 border-t border-zinc-800/80 bg-[#101317]">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px]">
            <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
            <span>{gitStatus?.branch || 'main'}</span>
          </div>
          {uncommittedCount > 0 ? (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
              <Circle className="w-2 h-2 fill-amber-400 text-amber-400" />
              <span>{uncommittedCount} modified</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400" />
              <span>Clean</span>
            </span>
          )}
        </div>

        <button
          onClick={onOpenPublish}
          className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs shadow-sm transition-all"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Publish Changes</span>
        </button>
      </div>
    </aside>
  );
};

