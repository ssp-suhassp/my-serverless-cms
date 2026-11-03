import React, { useState, useEffect } from 'react';
import {
  Key,
  Globe,
  Database,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Code2,
  Sparkles,
  ArrowRight,
  User,
} from 'lucide-react';
import { fetchConfig, saveConfig, fetchAuthUser, verifyToken } from '../api';
import type { UserConfig } from '../types';

interface SettingsViewProps {
  onReRunSetup?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onReRunSetup }) => {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [siteTitle, setSiteTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // API Inspector
  const [apiTab, setApiTab] = useState<'posts' | 'pages' | 'tags'>('posts');
  const [apiJsonData, setApiJsonData] = useState<string>('Loading...');

  const loadData = async () => {
    try {
      const cfg = await fetchConfig();
      setConfig(cfg);
      if (cfg.siteTitle) setSiteTitle(cfg.siteTitle);

      const user = await fetchAuthUser();
      if (user.authenticated) {
        setAuthUser(user.user);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const fetchInspectorData = async (endpoint: string) => {
    setApiJsonData('Querying local endpoint...');
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      setApiJsonData(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setApiJsonData(`Error querying ${endpoint}: ${err.message}`);
    }
  };

  useEffect(() => {
    if (apiTab === 'posts') fetchInspectorData('/api/posts');
    if (apiTab === 'pages') fetchInspectorData('/api/pages/home');
    if (apiTab === 'tags') fetchInspectorData('/api/tags.json');
  }, [apiTab]);

  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await saveConfig({ siteTitle: siteTitle.trim() });
      if (res.success) {
        setFeedback({ type: 'success', text: 'Publication title updated.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0d0f12] overflow-y-auto">
      {/* Header */}
      <div className="h-16 border-b border-zinc-800/80 px-8 flex items-center justify-between bg-[#14171c]/50 shrink-0">
        <h1 className="text-base font-semibold text-zinc-100">Settings &amp; Headless API</h1>
        {onReRunSetup && (
          <button
            onClick={onReRunSetup}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span>Switch Repository / Re-run Onboarding</span>
          </button>
        )}
      </div>

      <div className="max-w-4xl w-full mx-auto px-8 py-8 space-y-8">
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
              feedback.type === 'error'
                ? 'bg-red-950/30 border-red-900/50 text-red-300'
                : 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
            }`}
          >
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Section 1: GitHub Connection */}
        <section className="bg-[#14171c] border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">GitHub Connection</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Authenticated session used to commit and push changes.
              </p>
            </div>
            {authUser && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
                <img
                  src={authUser.avatar_url}
                  alt={authUser.login}
                  className="w-4 h-4 rounded-full"
                />
                <span className="font-mono text-zinc-300">@{authUser.login}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-[#101317] border border-zinc-800 rounded-lg">
              <span className="text-zinc-500 block text-[10px] uppercase font-sans">Repository</span>
              <span className="text-zinc-200 mt-0.5 block truncate">
                {config?.repoOwner}/{config?.repoName || 'Not configured'}
              </span>
            </div>
            <div className="p-3 bg-[#101317] border border-zinc-800 rounded-lg">
              <span className="text-zinc-500 block text-[10px] uppercase font-sans">Token Status</span>
              <span className="text-emerald-400 mt-0.5 block">
                {config?.hasToken ? 'Active & Verified' : 'No token configured'}
              </span>
            </div>
          </div>
        </section>

        {/* Section 2: Publication Configuration */}
        <section className="bg-[#14171c] border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-semibold text-zinc-100">Publication Details</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Public site metadata and GitHub Pages URL.
            </p>
          </div>

          <form onSubmit={handleSaveTitle} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Publication Title</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-lg bg-[#101317] border border-zinc-800 text-xs text-zinc-100 outline-none focus:border-zinc-500"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs shadow-sm transition-all"
                >
                  {saving ? 'Saving...' : 'Save Title'}
                </button>
              </div>
            </div>

            {config?.pagesUrl && (
              <div className="p-3.5 bg-[#101317] border border-zinc-800 rounded-lg text-xs flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-mono">Live GitHub Pages URL</span>
                  <span className="text-zinc-200 font-mono text-[11px] mt-0.5 block">{config.pagesUrl}</span>
                </div>
                <a
                  href={config.pagesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white px-2.5 py-1.5 rounded bg-zinc-800 text-xs"
                >
                  <span>Visit Site</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </form>
        </section>

        {/* Section 3: Headless REST JSON API Inspector */}
        <section className="bg-[#14171c] border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Headless Static REST JSON API</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Inspect raw payloads emitted into <code className="text-zinc-300">dist/api/*.json</code> during SSG build.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-[#101317] p-1 rounded-lg border border-zinc-800 text-xs">
              <button
                onClick={() => setApiTab('posts')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  apiTab === 'posts' ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400'
                }`}
              >
                /api/posts.json
              </button>
              <button
                onClick={() => setApiTab('pages')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  apiTab === 'pages' ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400'
                }`}
              >
                /api/pages/home.json
              </button>
              <button
                onClick={() => setApiTab('tags')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  apiTab === 'tags' ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400'
                }`}
              >
                /api/tags.json
              </button>
            </div>
          </div>

          <div className="relative">
            <pre className="p-4 rounded-xl bg-[#101317] border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto max-h-80 leading-relaxed">
              {apiJsonData}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
};
