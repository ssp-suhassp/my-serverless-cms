import type { FastifyPluginAsync } from 'fastify';
import {
  getGitStatus,
  publishContent,
  getDeploymentStatus,
  syncRemote,
  getCommitHistory,
  rollbackContent,
} from '../services/git';

export const gitRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/status', async (request, reply) => {
    try {
      const status = await getGitStatus();
      return status;
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to inspect Git status', details: err.message });
    }
  });

  fastify.post('/sync', async (request, reply) => {
    try {
      const result = await syncRemote();
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to sync with remote', details: err.message });
    }
  });

  fastify.post<{ Body: { message?: string } }>('/publish', async (request, reply) => {
    try {
      const result = await publishContent(request.body?.message);
      return reply.status(200).send(result);
    } catch (err: any) {
      if (err.statusCode === 409) {
        return reply.status(409).send({
          error: 'Remote conflict detected',
          message: err.message,
          behind: err.behind,
        });
      }
      return reply.status(500).send({
        error: 'Publish failed',
        details: err.message,
      });
    }
  });

  fastify.get('/deployment-status', async (request, reply) => {
    try {
      const status = await getDeploymentStatus();
      return status;
    } catch (err: any) {
      return reply.status(500).send({
        error: 'Failed to retrieve deployment status',
        details: err.message,
      });
    }
  });

  fastify.get('/deploy-status', async (request, reply) => {
    try {
      const status = await getDeploymentStatus();
      return status;
    } catch (err: any) {
      return reply.status(500).send({
        error: 'Failed to retrieve deployment status',
        details: err.message,
      });
    }
  });

  fastify.get('/history', async (request, reply) => {
    try {
      const commits = await getCommitHistory();
      return { commits };
    } catch (err: any) {
      return reply.status(500).send({
        error: 'Failed to retrieve Git history',
        details: err.message,
      });
    }
  });

  fastify.post<{ Body: { commitHash?: string } }>('/rollback', async (request, reply) => {
    const { commitHash } = request.body || {};
    if (!commitHash) {
      return reply.status(400).send({ error: 'Missing commitHash in request body.' });
    }

    try {
      const result = await rollbackContent(commitHash);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(500).send({
        error: 'Rollback failed',
        details: err.message,
      });
    }
  });
};

