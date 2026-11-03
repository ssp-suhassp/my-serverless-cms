import type { FastifyPluginAsync } from 'fastify';
import { loadConfig, saveConfig, type CMSConfig } from '../config';
import { provisionRepository, verifyGitHubToken, triggerWorkflowDispatchIfNeeded } from '../services/github';
import { pushInitialScaffold } from '../services/git';

export const setupRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/status', async () => {
    const config = loadConfig();
    const hasToken = Boolean(config.githubToken);
    const hasRepo = Boolean(config.repoOwner && config.repoName);

    let user = null;
    if (hasToken && config.githubToken) {
      try {
        user = await verifyGitHubToken(config.githubToken);
      } catch {}
    }

    return {
      authenticated: hasToken && Boolean(user),
      configured: hasToken && hasRepo,
      user,
      config: {
        siteTitle: config.siteTitle || 'My Serverless CMS Site',
        repoOwner: config.repoOwner,
        repoName: config.repoName,
        pagesUrl: config.pagesUrl,
        basePath: config.basePath || '/',
        hasToken,
      },
    };
  });

  fastify.get('/config', async () => {
    const config = loadConfig();
    return {
      ...config,
      githubToken: config.githubToken ? '••••••••' + config.githubToken.slice(-4) : undefined,
      hasToken: Boolean(config.githubToken),
    };
  });

  fastify.post<{ Body: Partial<CMSConfig> }>('/config', async (request, reply) => {
    const updates = request.body || {};
    try {
      const updated = saveConfig(updates);
      return {
        success: true,
        config: {
          ...updated,
          githubToken: updated.githubToken ? '••••••••' + updated.githubToken.slice(-4) : undefined,
          hasToken: Boolean(updated.githubToken),
        },
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.post<{
    Body: {
      repoName: string;
      isPrivate?: boolean;
      description?: string;
    };
  }>('/provision', async (request, reply) => {
    const { repoName, isPrivate, description } = request.body || {};
    if (!repoName) {
      return reply.status(400).send({ error: 'Missing required field: repoName' });
    }

    const config = loadConfig();
    if (!config.githubToken) {
      return reply.status(401).send({ error: 'Cannot provision repository: GitHub token is not set' });
    }

    try {
      const result = await provisionRepository(config.githubToken, repoName, {
        isPrivate,
        description,
      });

      // Configure authenticated origin and push initial monorepo scaffold to GitHub
      await pushInitialScaffold(result.owner, repoName, config.githubToken);

      // Trigger GitHub Actions workflow dispatch if not automatically scheduled
      triggerWorkflowDispatchIfNeeded(config.githubToken, result.owner, repoName).catch(() => {});

      return {
        success: true,
        result,
      };
    } catch (err: any) {
      return reply.status(500).send({
        error: 'Failed to provision repository',
        details: err.message,
      });
    }
  });
};

