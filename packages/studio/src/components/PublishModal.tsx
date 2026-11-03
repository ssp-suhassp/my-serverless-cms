import React, { useState } from 'react';
import { GitBranch, AlertTriangle, CheckCircle, RefreshCw, X, ArrowUpRight } from 'lucide-react';
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
      if (err.error === 'Remote conflict detected' || err.status === 409) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold">
            <GitBranch className="w-5 h-5 text-indigo-400" />
            <span>Publish Content to GitHub</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {successResult ? (
            <div className="space-y-4 text-center py-4">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">Successfully Published!</h3>
              <p className="text-sm text-slate-300">
                Commit <code className="bg-slate-800 px-2 py-0.5 rounded text-indigo-400 font-mono">{successResult.commitHash?.slice(0, 7)}</code> was pushed to branch <code className="text-indigo-400 font-mono">main</code>.
              </p>
              <p className="text-xs text-slate-500">
                GitHub Actions CI/CD has been triggered to rebuild the static site and Headless JSON API.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all"
              >
                Close & Monitor CI/CD
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Publish Error</p>
                    <p className="text-xs text-rose-300/90 mt-1">{error}</p>
                    {conflict && (
                      <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-white text-xs font-semibold border border-rose-500/40 transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync & Rebase with Remote'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Commit Message
                </label>
                <input
                  type="text"
                  placeholder="e.g. chore(content): publish new product launch article"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white text-sm placeholder:text-slate-600 outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">Changed Files ({totalChanges})</span>
                  <span>Branch: {status?.branch || 'main'}</span>
                </div>
                <div className="max-h-40 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-1 text-xs font-mono">
                  {totalChanges === 0 ? (
                    <div className="text-slate-600 italic">No uncommitted changes detected.</div>
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
                        <div key={f} className="text-rose-400 flex items-center justify-between">
                          <span>D {f}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400 space-y-1.5">
                <p className="text-slate-300 font-medium">Serverless CI/CD Pipeline Flow:</p>
                <p>1. Local daemon stages Markdown, JSON, and WebP media.</p>
                <p>2. Pre-commit hook enforces strict Zod schema validation.</p>
                <p>3. Pushes to GitHub &rarr; GitHub Actions rebuilds static site &amp; Headless API.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
                >
                  {publishing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <span>Commit & Push</span>
                      <ArrowUpRight className="w-4 h-4" />
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
