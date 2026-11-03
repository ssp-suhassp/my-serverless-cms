import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { OnboardingView } from './components/OnboardingView';
import { PublishModal } from './components/PublishModal';
import { HistoryModal } from './components/HistoryModal';
import { PostsView } from './components/PostsView';
import { PagesView } from './components/PagesView';
import { MediaView } from './components/MediaView';
import { SettingsView } from './components/SettingsView';
import { fetchGitStatus, fetchDeploymentStatus, fetchConfig, fetchSetupStatus, logout } from './api';
import type { StudioTab, GitStatus, DeploymentStatus, UserConfig, SetupStatus } from './types';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<StudioTab>('posts');
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [contentKey, setContentKey] = useState(0);

  const checkSetupAndStatus = async () => {
    try {
      const sStatus = await fetchSetupStatus();
      setSetupStatus(sStatus);
      if (sStatus.config) {
        setUserConfig(sStatus.config);
      }
      if (!sStatus.authenticated || !sStatus.configured) {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error('Failed to probe setup status:', err);
    } finally {
      setCheckingSetup(false);
    }
  };

  const refreshAllStatus = async () => {
    try {
      const [gStatus, dStatus, cfg] = await Promise.allSettled([
        fetchGitStatus(),
        fetchDeploymentStatus(),
        fetchConfig(),
      ]);

      if (gStatus.status === 'fulfilled') setGitStatus(gStatus.value);
      if (dStatus.status === 'fulfilled') setDeploymentStatus(dStatus.value);
      if (cfg.status === 'fulfilled') setUserConfig(cfg.value);
    } catch (err) {
      console.error('Status refresh error:', err);
    }
  };

  const handleRollbackComplete = async () => {
    await refreshAllStatus();
    setContentKey((prev) => prev + 1);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setSetupStatus(null);
      setUserConfig(null);
      setShowOnboarding(true);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  useEffect(() => {
    checkSetupAndStatus();
    refreshAllStatus();
    const interval = setInterval(refreshAllStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  if (checkingSetup) {
    return (
      <div className="h-screen w-screen bg-[#0d0f12] flex flex-col items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
        <span className="text-xs font-mono">Initializing local GitCMS environment...</span>
      </div>
    );
  }

  // Auth & Setup Gate
  if (showOnboarding || !setupStatus?.authenticated || !setupStatus?.configured) {
    return (
      <OnboardingView
        initialStatus={setupStatus}
        onCompleted={async () => {
          setShowOnboarding(false);
          await checkSetupAndStatus();
          await refreshAllStatus();
        }}
      />
    );
  }

  return (
    <div className="h-screen w-screen flex bg-[#0d0f12] text-zinc-100 overflow-hidden font-sans">
      {/* Studio Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        userConfig={userConfig}
        gitStatus={gitStatus}
        deploymentStatus={deploymentStatus}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenPublish={() => setIsPublishOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Workspace View */}
      <main className="flex-1 flex overflow-hidden" key={contentKey}>
        {currentTab === 'posts' && <PostsView onPublishTrigger={() => setIsPublishOpen(true)} />}
        {currentTab === 'pages' && <PagesView />}
        {currentTab === 'media' && <MediaView />}
        {currentTab === 'settings' && (
          <SettingsView
            onReRunSetup={() => setShowOnboarding(true)}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Publish Modal with Contextual Commits */}
      <PublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        status={gitStatus}
        onPublished={refreshAllStatus}
      />

      {/* Git History & Rollback Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onRollbackComplete={handleRollbackComplete}
      />
    </div>
  );
};
