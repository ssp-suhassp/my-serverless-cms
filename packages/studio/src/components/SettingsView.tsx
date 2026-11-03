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
} from 'lucide-react';
import {
  fetchConfig,
  saveConfig,
  fetchAuthUser,
  verifyToken,
  requestDeviceCode,
  pollDeviceCode,
  provisionRepository,
} from '../api';
import type { UserConfig } from '../types';

export const SettingsView: React.FC = () => {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [patInput, setPatInput] = useState('');
  const [clientIdInput, setClientIdInput] = useState('');
  const [deviceFlowState, setDeviceFlowState] = useState<any | null>(null);

  // Provisioning Form
  const [repoName, setRepoName] = useState('');
  const [siteTitle, setSiteTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

  // API Inspector
  const [apiTab, setApiTab] = useState<'posts' | 'pages' | 'tags'>('posts');
  const [apiJsonData, setApiJsonData] = useState<string>('Loading...');

  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const loadData = async () => {
    try {
      const cfg = await fetchConfig();
      setConfig(cfg);
      if (cfg.repoName) setRepoName(cfg.repoName);
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
    setApiJsonData('Fetching endpoint payload...');
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

  const handleVerifyPat = async () => {
    if (!patInput.trim()) return;
    try {
      const res = await verifyToken(patInput.trim());
      if (res.success) {
        setAuthUser(res.user);
        setFeedback({ type: 'success', message: `Authenticated as @${res.user.login}` });
        setPatInput('');
        await loadData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.details || 'Invalid PAT' });
    }
  };

  const handleStartDeviceFlow = async () => {
    if (!clientIdInput.trim()) {
      alert('Please enter a GitHub OAuth App Client ID');
      return;
    }
    try {
      const res = await requestDeviceCode(clientIdInput.trim());
      setDeviceFlowState(res);
      window.open(res.verification_uri, '_blank');

      // Start Polling
      const interval = (res.interval || 5) * 1000;
      const timer = setInterval(async () => {
        try {
          const pollRes = await pollDeviceCode(clientIdInput.trim(), res.device_code);
          if (pollRes.access_token) {
            clearInterval(timer);
            setDeviceFlowState(null);
            setFeedback({ type: 'success', message: 'GitHub Device Authorization complete!' });
            await loadData();
          }
        } catch {
          // Keep polling
        }
      }, interval);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Device flow failed' });
    }
  };

  const handleProvision = async () => {
    if (!repoName.trim()) {
      alert('Please enter a repository name.');
      return;
    }
    setProvisioning(true);
    setFeedback(null);
    try {
      const res = await provisionRepository({
        repoName: repoName.trim(),
        description: siteTitle.trim() || undefined,
        isPrivate,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Repository "${res.result.repo}" provisioned and GitHub Pages enabled!`,
        });
        await loadData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.details || err.message || 'Provisioning failed' });
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-950 space-y-8 max-w-5xl mx-auto w-full">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
            feedback.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Section 1: GitHub Authentication */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <div>
              <h3 className="text-sm font-bold text-white">GitHub Authentication</h3>
              <p className="text-xs text-slate-400">
                Connect your account for automated repository provisioning and GitHub Actions deployments.
              </p>
            </div>
          </div>

          {authUser && (
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
              <img
                src={authUser.avatar_url}
                alt={authUser.login}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-xs font-mono font-semibold text-white">@{authUser.login}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Option A: Direct Personal Access Token */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Key className="w-4 h-4 text-indigo-400" />
              <span>Direct Personal Access Token (PAT)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Paste a classic GitHub PAT or fine-grained token with <code className="text-indigo-400">repo</code> and <code className="text-indigo-400">workflow</code> permissions.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxx"
                value={patInput}
                onChange={(e) => setPatInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white outline-none font-mono"
              />
              <button
                onClick={handleVerifyPat}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Verify
              </button>
            </div>
          </div>

          {/* Option B: Device Flow OAuth */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>OAuth Device Authorization Flow (RFC 8628)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Connect via GitHub device code verification without embedding secrets in client bundles.
            </p>

            {deviceFlowState ? (
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-center space-y-2">
                <span className="text-[11px] text-indigo-300">Enter this code on GitHub:</span>
                <div className="text-lg font-mono font-bold text-white tracking-widest">
                  {deviceFlowState.user_code}
                </div>
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Waiting for browser approval...</span>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="OAuth Client ID"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white outline-none font-mono"
                />
                <button
                  onClick={handleStartDeviceFlow}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700"
                >
                  Connect
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: One-Click Repository & GitHub Pages Provisioner */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <Database className="w-6 h-6 text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Repository &amp; GitHub Pages Provisioner</h3>
            <p className="text-xs text-slate-400">
              Automatically creates the GitHub remote repo and activates serverless GitHub Pages deployments via workflow.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Repository Name</label>
            <input
              type="text"
              placeholder="e.g. serverless-cms"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Site Title</label>
            <input
              type="text"
              placeholder="e.g. My Technical Publications"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
            />
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={handleProvision}
              disabled={provisioning || !config?.githubToken}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
            >
              {provisioning ? 'Provisioning...' : 'Provision Repository & Pages'}
            </button>
          </div>
        </div>

        {config?.pagesUrl && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block">Live Edge Delivery URL:</span>
              <a
                href={config.pagesUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1.5 mt-0.5"
              >
                <span>{config.pagesUrl}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold uppercase">
              Workflow Pages Enabled
            </span>
          </div>
        )}
      </section>

      {/* Section 3: Headless REST JSON API Inspector */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Code2 className="w-6 h-6 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Headless Static REST API Explorer</h3>
              <p className="text-xs text-slate-400">
                Inspect the static JSON payloads pre-rendered for headless consumption across mobile and external web apps.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setApiTab('posts')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                apiTab === 'posts' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              /api/posts.json
            </button>
            <button
              onClick={() => setApiTab('pages')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                apiTab === 'pages' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              /api/pages/home.json
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
          <pre className="p-4 text-xs font-mono text-indigo-300 max-h-72 overflow-y-auto leading-relaxed">
            {apiJsonData}
          </pre>
        </div>
      </section>
    </div>
  );
};
