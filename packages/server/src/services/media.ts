import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PATHS } from '../config';

function ensureUploadsDir(): void {
  if (!fs.existsSync(PATHS.uploads)) {
    fs.mkdirSync(PATHS.uploads, { recursive: true });
  }
}

export interface MediaUploadResult {
  filename: string;
  path: string;
  url: string;
  width?: number;
  height?: number;
  size: number;
  format: string;
}

export interface MediaItem {
  filename: string;
  url: string;
  size: number;
  createdAt: string;
}

export interface OrphanCleanupResult {
  removedCount: number;
  removedFiles: string[];
}

function slugifyFilename(name: string): string {
  const nameWithoutExt = path.parse(name).name;
  return (
    nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'image'
  );
}

export async function processAndSaveImage(
  buffer: Buffer,
  originalName: string
): Promise<MediaUploadResult> {
  ensureUploadsDir();

  const baseSlug = slugifyFilename(originalName);
  const timestamp = Date.now();
  const filename = `${baseSlug}-${timestamp}.webp`;
  const destinationPath = path.join(PATHS.uploads, filename);

  const transformer = sharp(buffer)
    .resize({
      width: 1920,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .webp({ quality: 85 });

  const metadata = await transformer.metadata();
  const info = await transformer.toFile(destinationPath);

  const publicUrl = `/uploads/${filename}`;

  return {
    filename,
    path: publicUrl,
    url: publicUrl,
    width: info.width || metadata.width,
    height: info.height || metadata.height,
    size: info.size,
    format: 'webp',
  };
}

export function listMediaFiles(): MediaItem[] {
  ensureUploadsDir();

  const files = fs.readdirSync(PATHS.uploads);
  const items: MediaItem[] = [];

  for (const file of files) {
    if (file.startsWith('.')) continue;

    const fullPath = path.join(PATHS.uploads, file);
    const stats = fs.statSync(fullPath);

    if (stats.isFile()) {
      items.push({
        filename: file,
        url: `/uploads/${file}`,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
      });
    }
  }

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function deleteMediaFile(filename: string): { success: boolean; filename: string } {
  ensureUploadsDir();

  const sanitized = path.basename(filename);
  const filePath = path.join(PATHS.uploads, sanitized);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Media file not found: ${sanitized}`);
  }

  fs.unlinkSync(filePath);
  return { success: true, filename: sanitized };
}

export function cleanupOrphanAssets(): OrphanCleanupResult {
  ensureUploadsDir();

  const referencedFilenames = new Set<string>();

  // 1. Scan Markdown posts
  if (fs.existsSync(PATHS.posts)) {
    const postFiles = fs.readdirSync(PATHS.posts).filter((f) => f.endsWith('.md'));
    for (const file of postFiles) {
      const content = fs.readFileSync(path.join(PATHS.posts, file), 'utf-8');
      const matches = content.matchAll(/\/uploads\/([a-zA-Z0-9_\-\.]+\.webp)/g);
      for (const match of matches) {
        if (match[1]) referencedFilenames.add(match[1]);
      }
    }
  }

  // 2. Scan JSON pages
  if (fs.existsSync(PATHS.pages)) {
    const pageFiles = fs.readdirSync(PATHS.pages).filter((f) => f.endsWith('.json'));
    for (const file of pageFiles) {
      const content = fs.readFileSync(path.join(PATHS.pages, file), 'utf-8');
      const matches = content.matchAll(/\/uploads\/([a-zA-Z0-9_\-\.]+\.webp)/g);
      for (const match of matches) {
        if (match[1]) referencedFilenames.add(match[1]);
      }
    }
  }

  // 3. Scan public uploads
  const currentUploads = fs.readdirSync(PATHS.uploads).filter((f) => f.endsWith('.webp'));
  const removedFiles: string[] = [];

  for (const upload of currentUploads) {
    if (!referencedFilenames.has(upload)) {
      try {
        fs.unlinkSync(path.join(PATHS.uploads, upload));
        removedFiles.push(upload);
      } catch {}
    }
  }

  return {
    removedCount: removedFiles.length,
    removedFiles,
  };
}
