import type { FastifyPluginAsync } from 'fastify';
import {
  getGitStatus,
  publishContent,
  getDeploymentStatus,
  syncRemote,
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
};

