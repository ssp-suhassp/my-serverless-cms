import React, { useState, useEffect } from 'react';
import {
  Upload,
  Trash2,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  FileImage,
  RefreshCw,
  Clock,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import { fetchMedia, uploadMedia, deleteMedia, cleanupOrphanMedia } from '../api';
import type { MediaFile } from '../types';

export const MediaView: React.FC = () => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const data = await fetchMedia();
      setFiles(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load media' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    setFeedback(null);

    try {
      for (let i = 0; i < fileList.length; i++) {
        await uploadMedia(fileList[i]);
      }
      setFeedback({ type: 'success', message: 'Images transcoded to WebP and saved successfully.' });
      await loadMedia();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm(`Delete media file "${filename}"?`)) return;

    try {
      await deleteMedia(filename);
      await loadMedia();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete media' });
    }
  };

  const handleCleanupOrphans = async () => {
    if (!window.confirm('Scan all Markdown & JSON content and remove unreferenced images?')) return;

    setCleaning(true);
    try {
      const res = await cleanupOrphanMedia();
      setFeedback({
        type: 'success',
        message: `Orphan cleanup complete: removed ${res.removedCount} unreferenced asset(s).`,
      });
      await loadMedia();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Cleanup failed' });
    } finally {
      setCleaning(false);
    }
  };

  const copyPath = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedName(url);
    setTimeout(() => setCopiedName(null), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0f12]">
      {/* Top Media Bar */}
      <div className="h-16 border-b border-zinc-800/80 px-8 flex items-center justify-between bg-[#14171c]/50 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-zinc-100">Media Asset Library</h1>
          <span className="text-xs font-mono text-zinc-400 bg-[#101317] px-2 py-0.5 rounded border border-zinc-800">
            {files.length} WebP asset(s)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCleanupOrphans}
            disabled={cleaning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14171c] hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span>{cleaning ? 'Scanning...' : 'Clean Orphan Media'}</span>
          </button>

          <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium shadow-sm transition-all">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? 'Transcoding WebP...' : 'Upload Image'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`px-8 py-2.5 border-b text-xs flex items-center gap-2.5 ${
            feedback.type === 'error'
              ? 'bg-red-950/30 border-red-900/50 text-red-300'
              : 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Asset Grid */}
      <div className="flex-1 overflow-y-auto p-8">
        {files.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <FileImage className="w-12 h-12 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-semibold text-zinc-200">No media assets found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Images are automatically transcoded to WebP (max 1920px, 85 quality) and stored in public/uploads.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {files.map((file) => (
              <div
                key={file.filename}
                className="group relative bg-[#14171c] border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all flex flex-col shadow-sm"
              >
                {/* Thumbnail */}
                <div className="aspect-video w-full bg-[#101317] flex items-center justify-center overflow-hidden relative">
                  <img
                    src={file.url}
                    alt={file.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => copyPath(file.url)}
                      className="p-1.5 rounded-lg bg-zinc-800/90 text-white hover:bg-zinc-700 transition-colors"
                      title="Copy asset path"
                    >
                      {copiedName === file.url ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(file.filename)}
                      className="p-1.5 rounded-lg bg-red-900/90 text-white hover:bg-red-800 transition-colors"
                      title="Delete asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Meta details */}
                <div className="p-3 space-y-1">
                  <h4 className="text-xs font-medium text-zinc-200 truncate" title={file.filename}>
                    {file.filename}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <span>{formatSize(file.size)}</span>
                    <span className="uppercase text-[10px] text-zinc-400">WebP</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
