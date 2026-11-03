import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { PostFrontmatterSchema, PageSchema, type PostFrontmatter, type PageData } from '@cms/shared';
import { PATHS } from '../config';

function ensureDirs(): void {
  if (!fs.existsSync(PATHS.posts)) {
    fs.mkdirSync(PATHS.posts, { recursive: true });
  }
  if (!fs.existsSync(PATHS.pages)) {
    fs.mkdirSync(PATHS.pages, { recursive: true });
  }
}

export interface PostItem {
  slug: string;
  frontmatter: PostFrontmatter;
  body: string;
  filePath: string;
}

export function listPosts(): PostItem[] {
  ensureDirs();
  const files = fs.readdirSync(PATHS.posts).filter((f) => f.endsWith('.md'));

  const posts: PostItem[] = [];

  for (const file of files) {
    const filePath = path.join(PATHS.posts, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(content);

    const validated = PostFrontmatterSchema.parse({
      ...parsed.data,
      slug: parsed.data.slug || file.replace(/\.md$/, ''),
    });

    posts.push({
      slug: validated.slug,
      frontmatter: validated,
      body: parsed.content,
      filePath,
    });
  }

  return posts.sort((a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime());
}

export function getPost(slug: string): PostItem {
  ensureDirs();
  const filePath = path.join(PATHS.posts, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Post not found with slug: ${slug}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(content);

  const validated = PostFrontmatterSchema.parse({
    ...parsed.data,
    slug: parsed.data.slug || slug,
  });

  return {
    slug: validated.slug,
    frontmatter: validated,
    body: parsed.content,
    filePath,
  };
}

export function savePost(input: { frontmatter: unknown; body?: string }): PostItem {
  ensureDirs();
  const validated = PostFrontmatterSchema.parse(input.frontmatter);
  const filePath = path.join(PATHS.posts, `${validated.slug}.md`);

  const rawBody = input.body ?? '';
  const fileContent = matter.stringify(rawBody, validated);

  fs.writeFileSync(filePath, fileContent, 'utf-8');

  return {
    slug: validated.slug,
    frontmatter: validated,
    body: rawBody,
    filePath,
  };
}

export function deletePost(slug: string): { success: boolean; slug: string } {
  ensureDirs();
  const filePath = path.join(PATHS.posts, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Post not found with slug: ${slug}`);
  }

  fs.unlinkSync(filePath);
  return { success: true, slug };
}

export function listPages(): PageData[] {
  ensureDirs();
  const files = fs.readdirSync(PATHS.pages).filter((f) => f.endsWith('.json'));

  const pages: PageData[] = [];

  for (const file of files) {
    const filePath = path.join(PATHS.pages, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    const validated = PageSchema.parse(parsed);
    pages.push(validated);
  }

  return pages;
}

export function getPage(slug: string): PageData {
  ensureDirs();
  const filePath = path.join(PATHS.pages, `${slug}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Page not found with slug: ${slug}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content);
  return PageSchema.parse(parsed);
}

export function savePage(input: unknown): PageData {
  ensureDirs();
  const validated = PageSchema.parse(input);
  const filePath = path.join(PATHS.pages, `${validated.slug}.json`);

  fs.writeFileSync(filePath, JSON.stringify(validated, null, 2), 'utf-8');
  return validated;
}

export function deletePage(slug: string): { success: boolean; slug: string } {
  ensureDirs();
  if (slug === 'home') {
    throw new Error('Cannot delete the root "home" page.');
  }

  const filePath = path.join(PATHS.pages, `${slug}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Page not found with slug: ${slug}`);
  }

  fs.unlinkSync(filePath);
  return { success: true, slug };
}

