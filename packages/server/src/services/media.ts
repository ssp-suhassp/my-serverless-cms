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

function slugifyFilename(name: string): string {
  const nameWithoutExt = path.parse(name).name;
  return nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'image';
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
    width: info.width,
    height: info.height,
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

