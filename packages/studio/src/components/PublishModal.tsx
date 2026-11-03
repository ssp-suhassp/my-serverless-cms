import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  ExternalLink,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { publishGit, syncGit, fetchDeploymentStatus } from '../api';
import type { GitStatus, DeploymentStatus } from '../types';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: GitStatus | null;
  onPublished: () => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  status,
  onPublished,
}) => {
  const [publishState, setPublishState] = useState<'idle' | 'pushing' | 'building' | 'live' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [publishedCommit, setPublishedCommit] = useState<string | null>(null);

  const totalChanges =
    (status?.modified.length || 0) +
    (status?.not_added.length || 0) +
    (status?.created.length || 0) +
    (status?.deleted.length || 0) +
    (status?.staged.length || 0);

  const isDiverged = Boolean(status?.behind && status.behind > 0);
  const autoCommitMsg = status?.suggestedMessage || 'chore(cms): sync local publication updates';

  useEffect(() => {
    if (isOpen) {
      setPublishState('idle');
      setErrorMessage(null);
      setLiveUrl(null);
      setPublishedCommit(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExecutePublish = async () => {
    setPublishState('pushing');
    setErrorMessage(null);

    try {
      if (isDiverged) {
        await syncGit();
      }

      const res = await publishGit(autoCommitMsg);
      setPublishedCommit(res.commitHash ? res.commitHash.slice(0, 7) : 'latest');

      // Transition to building / polling deployment
      setPublishState('building');

      // Check deployment status
      try {
        const deployInfo = await fetchDeploymentStatus();
        if (deployInfo?.latestRun?.html_url) {
          setLiveUrl(deployInfo.latestRun.html_url);
        }
      } catch {}

      setPublishState('live');
      onPublished();
    } catch (err: any) {
      setPublishState('error');
      setErrorMessage(err.message || err.error || 'Failed to complete publish.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans">
      <div className="w-full max-w-md bg-[#14171c] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-[#101317]">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-100">1-Click Publish to GitHub</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {publishState === 'idle' && (
            <>
              {/* Contextual Commit Badge */}
              <div className="p-3.5 rounded-xl bg-[#101317] border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                    Auto-Matched Commit
                  </span>
                  <span className="font-mono text-zinc-400">
                    {totalChanges} {totalChanges === 1 ? 'file' : 'files'}
                  </span>
                </div>
                <div className="font-mono text-xs text-zinc-100 font-semibold bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-800 truncate">
                  {autoCommitMsg}
                </div>
              </div>

              {isDiverged && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/50 text-amber-300 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Remote repository is {status?.behind} commit(s) ahead. We will automatically sync &amp; rebase before pushing.</span>
                </div>
              )}

              {totalChanges === 0 && (
                <p className="text-xs text-zinc-400 text-center py-2">
                  All local content is up to date with your Git repository.
                </p>
              )}

              {/* Action Button */}
              <button
                onClick={handleExecutePublish}
                className="w-full py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <span>{isDiverged ? 'Sync & Publish Now' : 'Publish Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Pushing State */}
          {publishState === 'pushing' && (
            <div className="py-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-300 mx-auto" />
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">Pushing to GitHub...</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Committing staged content and pushing to <span className="font-mono text-zinc-200">origin/main</span>
                </p>
              </div>
            </div>
          )}

          {/* Building State */}
          {publishState === 'building' && (
            <div className="py-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-300 mx-auto" />
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">Building on GitHub Actions...</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  GitHub Pages workflow triggered to compile static assets and JSON API.
                </p>
              </div>
            </div>
          )}

          {/* Live State */}
          {publishState === 'live' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-zinc-100">Successfully Published!</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Commit <span className="font-mono text-zinc-200">{publishedCommit}</span> has been pushed to your repository.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                {liveUrl && (
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>View GitHub Action</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {publishState === 'error' && (
            <div className="py-4 space-y-4">
              <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 text-red-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage || 'Failed to complete publish.'}</span>
              </div>
              <button
                onClick={() => setPublishState('idle')}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
