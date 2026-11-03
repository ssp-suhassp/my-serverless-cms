import React, { useState, useEffect } from 'react';
import { Topbar } from './components/Topbar';
import { PublishModal } from './components/PublishModal';
import { PostsView } from './components/PostsView';
import { PagesView } from './components/PagesView';
import { MediaView } from './components/MediaView';
import { SettingsView } from './components/SettingsView';
import { fetchGitStatus, fetchDeploymentStatus, fetchConfig } from './api';
import type { StudioTab, GitStatus, DeploymentStatus, UserConfig } from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<StudioTab>('posts');
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [isPublishOpen, setIsPublishOpen] = useState(false);

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

  useEffect(() => {
    refreshAllStatus();
    const interval = setInterval(refreshAllStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Topbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        gitStatus={gitStatus}
        deploymentStatus={deploymentStatus}
        userConfig={userConfig}
        onOpenPublish={() => setIsPublishOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {currentTab === 'posts' && <PostsView />}
        {currentTab === 'pages' && <PagesView />}
        {currentTab === 'media' && <MediaView />}
        {currentTab === 'settings' && <SettingsView />}
      </div>

      <PublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        status={gitStatus}
        onPublished={refreshAllStatus}
      />
    </div>
  );
};
