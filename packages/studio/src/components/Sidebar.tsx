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
} from 'lucide-react';
import type { StudioTab, GitStatus, UserConfig } from '../types';

interface SidebarProps {
  currentTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  userConfig: UserConfig | null;
  gitStatus: GitStatus | null;
  onOpenHistory: () => void;
  onOpenPublish: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  userConfig,
  gitStatus,
  onOpenHistory,
  onOpenPublish,
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

