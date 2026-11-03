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
  ArrowRight,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Git Version History &amp; Rollback</h2>
              <p className="text-xs text-slate-400">
                Non-destructive content recovery powered by immutable Git version control.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Alert */}
        <div className="px-6 py-3 bg-indigo-950/30 border-b border-indigo-900/30 flex items-center gap-3 text-xs text-indigo-300">
          <GitCommitIcon className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            Restoring a version checks out <code className="text-indigo-200 bg-indigo-950 px-1 py-0.5 rounded">src/content/</code> from that commit and creates a new commit forward, keeping history safe and conflict-free.
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Confirm Dialog */}
          {confirmCommit && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Confirm Content Rollback</span>
              </div>
              <p className="text-xs text-slate-300">
                Are you sure you want to restore content to commit{' '}
                <span className="font-mono text-amber-400 font-bold">{confirmCommit.shortHash}</span> (
                <em className="text-slate-200">"{confirmCommit.message}"</em>)?
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
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span>Reading Git repository commit log...</span>
            </div>
          ) : commits.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No commit history found in local repository.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {commits.map((commit, idx) => {
                const isLatest = idx === 0;
                return (
                  <div key={commit.hash} className="relative group">
                    {/* Timeline Node */}
                    <div
                      className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 ${
                        isLatest
                          ? 'bg-indigo-500 border-indigo-400 shadow-sm shadow-indigo-500'
                          : 'bg-slate-900 border-slate-600 group-hover:border-slate-400'
                      }`}
                    />

                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex items-start justify-between gap-4">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 font-semibold">
                            {commit.shortHash}
                          </span>
                          {isLatest && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                              Current HEAD
                            </span>
                          )}
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {new Date(commit.date).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-200 break-words">
                          {commit.message}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          Author: {commit.author_name}
                        </p>
                      </div>

                      {!isLatest && (
                        <button
                          onClick={() => setConfirmCommit(commit)}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 text-xs font-medium transition-all"
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
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>{commits.length} recent commits recorded</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

