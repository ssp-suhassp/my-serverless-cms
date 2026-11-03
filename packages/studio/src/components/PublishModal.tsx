import React, { useState, useEffect } from 'react';
import { GitBranch, AlertTriangle, CheckCircle, RefreshCw, X, ArrowUpRight, Sparkles } from 'lucide-react';
import { publishGit, syncGit } from '../api';
import type { GitStatus } from '../types';

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
  const [commitMessage, setCommitMessage] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<boolean>(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCommitMessage(status?.suggestedMessage || '');
      setError(null);
      setConflict(false);
      setSuccessResult(null);
    }
  }, [isOpen, status]);

  if (!isOpen) return null;

  const totalChanges =
    (status?.modified.length || 0) +
    (status?.not_added.length || 0) +
    (status?.created.length || 0) +
    (status?.deleted.length || 0) +
    (status?.staged.length || 0);

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    setConflict(false);
    try {
      const result = await publishGit(commitMessage.trim() || undefined);
      setSuccessResult(result);
      onPublished();
    } catch (err: any) {
      if (err.error === 'Remote conflict detected' || err.statusCode === 409) {
        setConflict(true);
        setError('Remote repository has newer commits. Please sync and rebase first.');
      } else {
        setError(err.message || err.error || 'Failed to publish changes.');
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      await syncGit();
      setConflict(false);
      onPublished();
    } catch (err: any) {
      setError(err.message || 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#14171c] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#101317]">
          <div className="flex items-center gap-2 text-zinc-100 font-medium text-sm">
            <GitBranch className="w-4 h-4 text-zinc-400" />
            <span>Publish Changes to GitHub</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {successResult ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-zinc-100">Successfully Published</h3>
                <p className="text-xs text-zinc-400">
                  Committed as <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200 font-mono">{successResult.commitHash?.slice(0, 7)}</code>
                </p>
                <p className="text-xs text-zinc-300 font-mono pt-1">
                  "{successResult.commitMessage}"
                </p>
              </div>
              <p className="text-xs text-zinc-500">
                GitHub Actions CI/CD has been triggered to rebuild the static site and JSON APIs.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs transition-all shadow-sm"
              >
                Close &amp; Continue
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p>{error}</p>
                    {conflict && (
                      <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-900/50 hover:bg-red-900 text-white text-xs font-medium transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                        <span>{syncing ? 'Syncing...' : 'Sync & Rebase with Remote'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Contextual Commit Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Self-Matching Commit Message</span>
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">Auto-generated</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. publish(post): New Article"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#101317] border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              {/* Changed Files Summary */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-medium">Staged Changes ({totalChanges} files)</span>
                  <span className="font-mono text-[11px]">branch: {status?.branch || 'main'}</span>
                </div>
                <div className="max-h-36 overflow-y-auto rounded-xl bg-[#101317] border border-zinc-800 p-3 space-y-1 text-xs font-mono">
                  {totalChanges === 0 ? (
                    <div className="text-zinc-500 italic">No uncommitted changes detected.</div>
                  ) : (
                    <>
                      {status?.modified.map((f) => (
                        <div key={f} className="text-amber-400 flex items-center justify-between">
                          <span>M {f}</span>
                        </div>
                      ))}
                      {status?.not_added.map((f) => (
                        <div key={f} className="text-emerald-400 flex items-center justify-between">
                          <span>? {f}</span>
                        </div>
                      ))}
                      {status?.created.map((f) => (
                        <div key={f} className="text-emerald-400 flex items-center justify-between">
                          <span>A {f}</span>
                        </div>
                      ))}
                      {status?.deleted.map((f) => (
                        <div key={f} className="text-red-400 flex items-center justify-between">
                          <span>D {f}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs shadow-sm transition-all"
                >
                  {publishing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm &amp; Push to GitHub</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
