import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import {
  listPosts,
  getPost,
  savePost,
  deletePost,
} from '../services/content';

export const postRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => {
    const posts = listPosts();
    return {
      total: posts.length,
      posts,
    };
  });

  fastify.get<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    const { slug } = request.params;
    try {
      const post = getPost(slug);
      return post;
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });

  fastify.post<{
    Body: {
      frontmatter: unknown;
      body?: string;
    };
  }>('/', async (request, reply) => {
    try {
      const result = savePost(request.body || { frontmatter: {} });
      return reply.status(200).send({
        success: true,
        post: result,
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
      const result = deletePost(slug);
      return result;
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });
};

