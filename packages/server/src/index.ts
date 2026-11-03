import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PATHS } from './config';
import { authRoutes } from './routes/auth';
import { setupRoutes } from './routes/setup';
import { postRoutes } from './routes/posts';
import { pageRoutes } from './routes/pages';
import { mediaRoutes } from './routes/media';
import { gitRoutes } from './routes/git';

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  await server.register(cors, {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });

  await server.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
  });

  if (!fs.existsSync(PATHS.uploads)) {
    fs.mkdirSync(PATHS.uploads, { recursive: true });
  }

  await server.register(fastifyStatic, {
    root: PATHS.uploads,
    prefix: '/uploads/',
  });

  server.get('/health', async () => {
    return {
      status: 'ok',
      service: 'cms-server',
      port: 4000,
      timestamp: new Date().toISOString(),
    };
  });

  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(setupRoutes, { prefix: '/api/setup' });
  await server.register(postRoutes, { prefix: '/api/posts' });
  await server.register(pageRoutes, { prefix: '/api/pages' });
  await server.register(mediaRoutes, { prefix: '/api/media' });
  await server.register(gitRoutes, { prefix: '/api/git' });

  return server;
}

const isDirectRun = Boolean(
  process.argv[1] &&
  !process.argv[1].includes('test-e2e') &&
  !process.argv[1].includes('test-phase2')
);

if (isDirectRun) {
  const start = async () => {
    try {
      const server = await buildServer();
      const port = Number(process.env.PORT) || 4000;
      const host = process.env.HOST || '127.0.0.1';
      await server.listen({ port, host });
      console.log(`[CMS Server] Daemon running at http://${host}:${port}`);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  };

  start();
}
