import type { FastifyPluginAsync } from 'fastify';
import {
  processAndSaveImage,
  listMediaFiles,
  deleteMediaFile,
  cleanupOrphanAssets,
} from '../services/media';

export const mediaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/upload', async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const buffer = await data.toBuffer();
      const result = await processAndSaveImage(buffer, data.filename);

      return reply.status(200).send({
        success: true,
        media: result,
      });
    } catch (err: any) {
      return reply.status(500).send({
        error: 'Image processing failed',
        details: err.message,
      });
    }
  });

  fastify.get('/', async () => {
    const files = listMediaFiles();
    return {
      total: files.length,
      files,
    };
  });

  fastify.post('/cleanup-orphans', async () => {
    const result = cleanupOrphanAssets();
    return {
      success: true,
      ...result,
    };
  });

  fastify.delete<{ Params: { filename: string } }>('/:filename', async (request, reply) => {
    const { filename } = request.params;
    try {
      const result = deleteMediaFile(filename);
      return result;
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });
};
