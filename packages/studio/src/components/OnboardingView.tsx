import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  Key,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  GitBranch,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  requestDeviceCode,
  pollDeviceCode,
  verifyToken,
  provisionRepository,
  saveConfig,
} from '../api';
import type { SetupStatus, UserConfig } from '../types';

interface OnboardingViewProps {
  initialStatus: SetupStatus | null;
  onCompleted: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  initialStatus,
  onCompleted,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(
    initialStatus?.authenticated ? 2 : 1
  );

  // Step 1: Device flow & PAT
  const [deviceData, setDeviceData] = useState<{
    device_code: string;
    user_code: string;
    verification_uri: string;
    interval: number;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'requesting' | 'waiting_user' | 'authenticated'>('idle');
  const [showPatInput, setShowPatInput] = useState(false);
  const [patInput, setPatInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  // Authenticated user state
  const [user, setUser] = useState<SetupStatus['user']>(initialStatus?.user || null);

  // Step 2: Repo Config
  const [siteTitle, setSiteTitle] = useState(
    initialStatus?.config.siteTitle || 'My Serverless Publication'
  );
  const [repoName, setRepoName] = useState(
    initialStatus?.config.repoName || 'my-serverless-cms'
  );
  const [provisionType, setProvisionType] = useState<'create' | 'connect'>('create');
  const [isPrivate, setIsPrivate] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  // Step 3: Verified Pages Info
  const [pagesUrl, setPagesUrl] = useState<string>(
    initialStatus?.config.pagesUrl || ''
  );

  // -------------------------------------------------------------
  // Step 1: Device Flow
  // -------------------------------------------------------------
  const handleStartDeviceFlow = async () => {
    setAuthError(null);
    setPollingStatus('requesting');
    try {
      const clientId = 'Ov23liM3hW7i6f4v9S8g';
      const data = await requestDeviceCode(clientId);
      if (data.user_code) {
        setDeviceData(data);
        setPollingStatus('waiting_user');
      } else {
        setAuthError('Failed to obtain device code from GitHub.');
        setPollingStatus('idle');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Network error requesting device code');
      setPollingStatus('idle');
    }
  };

  // Polling loop for Device Flow
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (deviceData && pollingStatus === 'waiting_user') {
      const intervalMs = Math.max((deviceData.interval || 5) * 1000, 5000);
      timer = setInterval(async () => {
        try {
          const clientId = 'Ov23liM3hW7i6f4v9S8g';
          const tokenRes = await pollDeviceCode(clientId, deviceData.device_code);
          if (tokenRes.access_token) {
            setPollingStatus('authenticated');
            const verifyRes = await verifyToken(tokenRes.access_token);
            if (verifyRes.success) {
              setUser(verifyRes.user);
              setStep(2);
            }
          }
        } catch {}
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [deviceData, pollingStatus]);

  const handleCopyUserCode = () => {
    if (deviceData?.user_code) {
      navigator.clipboard.writeText(deviceData.user_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handlePatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patInput.trim()) return;
    setAuthenticating(true);
    setAuthError(null);
    try {
      const res = await verifyToken(patInput.trim());
      if (res.success && res.user) {
        setUser(res.user);
        setStep(2);
      } else {
        setAuthError(res.error || 'Token verification failed. Ensure repo and workflow scopes are granted.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Token verification request failed');
    } finally {
      setAuthenticating(false);
    }
  };

  // -------------------------------------------------------------
  // Step 2: Provision Repository & Setup Pages
  // -------------------------------------------------------------
  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisioning(true);
    setProvisionError(null);

    try {
      if (provisionType === 'create') {
        const res = await provisionRepository({
          repoName: repoName.trim(),
          isPrivate,
          description: siteTitle.trim(),
        });

        if (res.success) {
          const generatedPagesUrl = res.result?.pagesUrl || `https://${user?.login}.github.io/${repoName.trim()}/`;
          setPagesUrl(generatedPagesUrl);
          await saveConfig({
            siteTitle: siteTitle.trim(),
            repoOwner: user?.login,
            repoName: repoName.trim(),
            pagesUrl: generatedPagesUrl,
            basePath: `/${repoName.trim()}/`,
          });
          setStep(3);
        } else {
          setProvisionError(res.error || res.details || 'Failed to provision repository.');
        }
      } else {
        const generatedPagesUrl = `https://${user?.login}.github.io/${repoName.trim()}/`;
        setPagesUrl(generatedPagesUrl);
        await saveConfig({
          siteTitle: siteTitle.trim(),
          repoOwner: user?.login,
          repoName: repoName.trim(),
          pagesUrl: generatedPagesUrl,
          basePath: `/${repoName.trim()}/`,
        });
        setStep(3);
      }
    } catch (err: any) {
      setProvisionError(err.message || 'Failed to configure repository.');
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0f12] text-zinc-100 flex flex-col items-center justify-center p-6 overflow-y-auto font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-zinc-800/20 blur-3xl pointer-events-none rounded-full" />

      <div className="w-full max-w-xl relative">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 mb-4 shadow-sm">
            <span className="font-serif font-bold text-xl text-zinc-100">G</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Welcome to GitCMS
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Zero-database, local-first publishing powered by Git &amp; GitHub Pages
          </p>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div
              className={`h-1.5 w-12 rounded-full transition-colors ${
                step >= 1 ? 'bg-zinc-200' : 'bg-zinc-800'
              }`}
            />
            <div
              className={`h-1.5 w-12 rounded-full transition-colors ${
                step >= 2 ? 'bg-zinc-200' : 'bg-zinc-800'
              }`}
            />
            <div
              className={`h-1.5 w-12 rounded-full transition-colors ${
                step >= 3 ? 'bg-zinc-200' : 'bg-zinc-800'
              }`}
            />
          </div>
        </div>

        {/* Card Frame */}
        <div className="bg-[#14171c] border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8">
          {/* ======================================================== */}
          {/* STEP 1: Connect to GitHub                                */}
          {/* ======================================================== */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <h2 className="text-base font-medium text-zinc-100">Step 1: Sign in with GitHub</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Authorize your local studio to push articles, transcode assets, and deploy to Pages.
                </p>
              </div>

              {authError && (
                <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 text-red-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Primary: Continue with GitHub (Device Flow) */}
              {!deviceData ? (
                <div className="space-y-3">
                  <button
                    onClick={handleStartDeviceFlow}
                    disabled={pollingStatus === 'requesting'}
                    className="w-full inline-flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-sm transition-all shadow-sm"
                  >
                    {pollingStatus === 'requesting' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Contacting GitHub...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue with GitHub</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-zinc-500">
                    Uses secure RFC 8628 Device Authorization Flow without exposing credentials.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#101317] border border-zinc-800 rounded-xl p-5 text-center space-y-3">
                    <span className="text-xs uppercase font-mono tracking-widest text-zinc-400 font-medium">
                      Your One-Time Code
                    </span>
                    <div className="flex items-center justify-center gap-3">
                      <span className="font-mono text-3xl font-bold tracking-wider text-zinc-100 select-all">
                        {deviceData.user_code}
                      </span>
                      <button
                        onClick={handleCopyUserCode}
                        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        title="Copy Code"
                      >
                        {copiedCode ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Copy the code above and enter it on the GitHub verification page.
                    </p>
                  </div>

                  <a
                    href={deviceData.verification_uri || 'https://github.com/login/device'}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-sm transition-all shadow-sm"
                  >
                    <span>Authorize on GitHub</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 pt-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                    <span>Waiting for GitHub confirmation...</span>
                  </div>
                </div>
              )}

              {/* Collapsible: PAT Fallback */}
              <div className="border-t border-zinc-800/80 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPatInput((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Key className="w-3.5 h-3.5 text-zinc-400" />
                    Or connect via Personal Access Token (PAT)
                  </span>
                  {showPatInput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showPatInput && (
                  <form onSubmit={handlePatSubmit} className="space-y-3 mt-3 pt-3 border-t border-zinc-800/60">
                    <div className="space-y-1.5">
                      <input
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        value={patInput}
                        onChange={(e) => setPatInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#101317] border border-zinc-800 text-zinc-100 font-mono text-xs focus:outline-none focus:border-zinc-500"
                      />
                      <p className="text-[11px] text-zinc-400">
                        Token requires <code className="text-zinc-200">repo</code> and <code className="text-zinc-200">workflow</code> permissions.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={authenticating || !patInput.trim()}
                      className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      {authenticating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying Token...</span>
                        </>
                      ) : (
                        <span>Verify &amp; Connect</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: Site & Repository Configuration                 */}
          {/* ======================================================== */}
          {step === 2 && (
            <form onSubmit={handleProvisionSubmit} className="space-y-5">
              <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium text-zinc-100">Step 2: Repository &amp; Pages Setup</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Configure your publication and link it to GitHub Pages.
                  </p>
                </div>
                {user && (
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
                    {user.avatar_url && (
                      <img src={user.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                    )}
                    <span className="text-zinc-200 font-mono text-[11px]">@{user.login}</span>
                  </div>
                )}
              </div>

              {provisionError && (
                <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 text-red-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{provisionError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Publication Title</label>
                  <input
                    type="text"
                    value={siteTitle}
                    onChange={(e) => setSiteTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#101317] border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500"
                    placeholder="The Modern Web Publication"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Target Repository Name</label>
                  <div className="flex items-center">
                    <span className="px-3.5 py-2.5 rounded-l-xl bg-zinc-900 border border-r-0 border-zinc-800 text-zinc-400 font-mono text-xs">
                      {user?.login}/
                    </span>
                    <input
                      type="text"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'))}
                      className="flex-1 px-3.5 py-2.5 rounded-r-xl bg-[#101317] border border-zinc-800 text-zinc-100 font-mono text-xs focus:outline-none focus:border-zinc-500"
                      placeholder="my-serverless-cms"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label
                    onClick={() => setProvisionType('create')}
                    className={`p-3.5 rounded-xl border cursor-pointer text-xs transition-all ${
                      provisionType === 'create'
                        ? 'bg-zinc-800/60 border-zinc-500 text-zinc-100'
                        : 'bg-[#101317] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span className="font-semibold block mb-0.5">Create New Repo</span>
                    <span className="text-[11px] text-zinc-400">
                      Creates repository and enables Pages workflow.
                    </span>
                  </label>

                  <label
                    onClick={() => setProvisionType('connect')}
                    className={`p-3.5 rounded-xl border cursor-pointer text-xs transition-all ${
                      provisionType === 'connect'
                        ? 'bg-zinc-800/60 border-zinc-500 text-zinc-100'
                        : 'bg-[#101317] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span className="font-semibold block mb-0.5">Connect Existing</span>
                    <span className="text-[11px] text-zinc-400">
                      Links local workspace to an existing repository.
                    </span>
                  </label>
                </div>

                {provisionType === 'create' && (
                  <div className="flex items-center gap-2 pt-1 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      id="privateRepo"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-700"
                    />
                    <label htmlFor="privateRepo" className="cursor-pointer">
                      Make repository private (GitHub Pages requires GitHub Pro for private repos)
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={provisioning || !repoName.trim()}
                  className="w-full py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {provisioning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Provisioning GitHub Pages Repository...</span>
                    </>
                  ) : (
                    <>
                      <span>Provision &amp; Configure Pages</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* STEP 3: Verification & Launch                           */}
          {/* ======================================================== */}
          {step === 3 && (
            <div className="space-y-6 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-zinc-100">Setup Complete!</h2>
                <p className="text-xs text-zinc-400">
                  Your local workspace is connected to <span className="text-zinc-200 font-mono font-medium">@{user?.login}/{repoName}</span>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#101317] border border-zinc-800 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-zinc-400" /> Public Pages Endpoint
                  </span>
                  <a
                    href={pagesUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-200 hover:text-white flex items-center gap-1 font-mono text-[11px]"
                  >
                    <span>{pagesUrl}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/80">
                  <span className="flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-zinc-400" /> CI/CD Deployment
                  </span>
                  <span className="text-emerald-400 font-medium">Workflow Active (.github/workflows/deploy.yml)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onCompleted}
                className="w-full py-3 px-4 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>Launch Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
