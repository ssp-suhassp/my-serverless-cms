import { defineCollection } from 'astro:content';
import { PostFrontmatterSchema, PageSchema } from '@cms/shared';

const posts = defineCollection({
  type: 'content',
  schema: PostFrontmatterSchema.omit({ slug: true }),
});

const pages = defineCollection({
  type: 'data',
  schema: PageSchema,
});

export const collections = {
  posts,
  pages,
};
