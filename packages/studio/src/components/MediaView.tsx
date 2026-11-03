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
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* Top Media Bar */}
      <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/30 shrink-0">
        <div className="flex items-center gap-3">
          <FileImage className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white">Media Asset Library</h2>
          <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {files.length} asset(s)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCleanupOrphans}
            disabled={cleaning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{cleaning ? 'Scanning...' : 'Clean Orphaned Media'}</span>
          </button>

          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Transcoding WebP...' : 'Upload Asset'}</span>
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
          className={`px-6 py-3 border-b text-xs flex items-center gap-3 ${
            feedback.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Media Grid */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        {files.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
              <FileImage className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">No Media Uploaded Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload raw PNG, JPEG, or TIFF photos. They will be automatically transcoded to high-efficiency WebP assets at 85% quality on localhost.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {files.map((file) => (
              <div
                key={file.filename}
                className="group relative rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden flex flex-col hover:border-slate-700 transition-all"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center">
                  <img
                    src={file.url}
                    alt={file.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] font-mono text-indigo-300 uppercase">
                    WebP
                  </span>
                </div>

                {/* Details */}
                <div className="p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-white truncate" title={file.filename}>
                    {file.filename}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" /> {formatSize(file.size)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(file.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center gap-1.5 border-t border-slate-800/80">
                    <button
                      onClick={() => copyPath(file.url)}
                      className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      title="Copy relative path for Markdown"
                    >
                      {copiedName === file.url ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Path</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(file.filename)}
                      className="p-1 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

