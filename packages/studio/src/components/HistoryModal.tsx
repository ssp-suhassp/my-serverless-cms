import React, { useEffect, useState } from 'react';
import {
  History,
  RotateCcw,
  CheckCircle2,
  Clock,
  GitCommit as GitCommitIcon,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { fetchGitHistory, rollbackGitContent } from '../api';
import type { GitCommit } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRollbackComplete: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onRollbackComplete,
}) => {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCommit, setConfirmCommit] = useState<GitCommit | null>(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGitHistory();
      setCommits(res.commits || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load commit timeline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      setConfirmCommit(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const handleRollback = async () => {
    if (!confirmCommit) return;
    setRollingBack(true);
    setError(null);
    try {
      const res = await rollbackGitContent(confirmCommit.hash);
      if (res.success) {
        setSuccessMessage(`Successfully restored content to ${res.restoredTo}. A new atomic commit has been created.`);
        setConfirmCommit(null);
        await loadHistory();
        onRollbackComplete();
      }
    } catch (err: any) {
      setError(err.details || err.message || 'Rollback failed.');
    } finally {
      setRollingBack(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#14171c] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-[#101317]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-850 border border-zinc-700/60 text-zinc-300">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Git Commit History &amp; Rollback</h2>
              <p className="text-xs text-zinc-400">
                Non-destructive snapshot recovery powered by immutable Git version control.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 text-red-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-900/50 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Confirm Dialog */}
          {confirmCommit && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-3">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Confirm Content Rollback</span>
              </div>
              <p className="text-xs text-zinc-300">
                Restore content to commit <span className="font-mono text-amber-400 font-semibold">{confirmCommit.shortHash}</span> (
                <em className="text-zinc-200">"{confirmCommit.message}"</em>)?
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleRollback}
                  disabled={rollingBack}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-all"
                >
                  {rollingBack ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Restoring...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Confirm &amp; Restore</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setConfirmCommit(null)}
                  disabled={rollingBack}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              <span>Reading Git repository commit log...</span>
            </div>
          ) : commits.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No commit history found in local repository.
            </div>
          ) : (
            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
              {commits.map((commit, idx) => {
                const isLatest = idx === 0;
                return (
                  <div key={commit.hash} className="relative group">
                    {/* Node Dot */}
                    <div
                      className={`absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full border-2 ${isLatest
                          ? 'bg-zinc-100 border-zinc-100 shadow-sm'
                          : 'bg-zinc-900 border-zinc-600 group-hover:border-zinc-400'
                        }`}
                    />

                    <div className="p-3.5 rounded-xl bg-[#101317] border border-zinc-800/80 hover:border-zinc-700 transition-all flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-semibold">
                            {commit.shortHash}
                          </span>
                          {isLatest && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                              Current HEAD
                            </span>
                          )}
                          <span className="text-xs text-zinc-500 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-zinc-600" />
                            {new Date(commit.date).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-zinc-200 break-words font-mono">
                          {commit.message}
                        </p>
                        <p className="text-[11px] text-zinc-500 font-mono">
                          Author: {commit.author_name}
                        </p>
                      </div>

                      {!isLatest && (
                        <button
                          onClick={() => setConfirmCommit(commit)}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-all"
                          title="Restore content to this snapshot"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-[#101317] flex items-center justify-between text-xs text-zinc-400">
          <span>{commits.length} commits recorded in history</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
