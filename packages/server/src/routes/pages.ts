import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import {
  listPages,
  getPage,
  savePage,
  deletePage,
} from '../services/content';

export const pageRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => {
    const pages = listPages();
    return {
      total: pages.length,
      pages,
    };
  });

  fastify.get<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    const { slug } = request.params;
    try {
      const page = getPage(slug);
      return page;
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });

  fastify.post<{ Body: unknown }>('/', async (request, reply) => {
    try {
      const page = savePage(request.body);
      return reply.status(200).send({
        success: true,
        page,
      });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.delete<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    const { slug } = request.params;
    try {
      const result = deletePage(slug);
      return result;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
};

