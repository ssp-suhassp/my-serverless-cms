import type { FastifyPluginAsync } from 'fastify';
import {
  initiateDeviceFlow,
  pollDeviceToken,
  verifyGitHubToken,
} from '../services/github';
import { loadConfig, saveConfig, clearConfig } from '../config';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: { clientId: string } }>('/device-code', async (request, reply) => {
    const { clientId } = request.body || {};
    if (!clientId) {
      return reply.status(400).send({ error: 'Missing clientId in request body' });
    }

    try {
      const result = await initiateDeviceFlow(clientId);
      return result;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.post<{ Body: { clientId: string; deviceCode: string } }>('/poll-device', async (request, reply) => {
    const { clientId, deviceCode } = request.body || {};
    if (!clientId || !deviceCode) {
      return reply.status(400).send({ error: 'Missing clientId or deviceCode' });
    }

    try {
      const result = await pollDeviceToken(clientId, deviceCode);
      if (result.access_token) {
        saveConfig({ githubToken: result.access_token });
      }
      return result;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.post<{ Body: { token?: string } }>('/verify', async (request, reply) => {
    const token = request.body?.token || loadConfig().githubToken;
    if (!token) {
      return reply.status(401).send({ error: 'No GitHub token provided or found in config' });
    }

    try {
      const user = await verifyGitHubToken(token);
      if (request.body?.token) {
        saveConfig({ githubToken: token, repoOwner: user.login });
      }
      return { success: true, user };
    } catch (err: any) {
      return reply.status(401).send({ error: 'Invalid GitHub token', details: err.message });
    }
  });

  fastify.get('/user', async (request, reply) => {
    const token = loadConfig().githubToken;
    if (!token) {
      return reply.status(401).send({ error: 'Unauthenticated: No GitHub token configured' });
    }

    try {
      const user = await verifyGitHubToken(token);
      return { authenticated: true, user };
    } catch (err: any) {
      return reply.status(401).send({ authenticated: false, error: err.message });
    }
  });

  fastify.post('/logout', async () => {
    clearConfig();
    return { success: true, message: 'Logged out successfully' };
  });
};

