import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Plus,
  Search,
  Trash2,
  Save,
  Eye,
  Code,
  FileEdit,
  Tag,
  Upload,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import { fetchPosts, savePost, deletePost, uploadMedia } from '../api';
import type { PostItem, PostFrontmatter } from '../types';

export const PostsView: React.FC = () => {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editorMode, setEditorMode] = useState<'wysiwyg' | 'markdown' | 'preview'>('wysiwyg');

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [date, setDate] = useState('');
  const [author, setAuthor] = useState('Admin');
  const [excerpt, setExcerpt] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [draft, setDraft] = useState(false);
  const [markdownBody, setMarkdownBody] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string; issues?: any[] } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension.configure({ inline: true }),
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your story in rich text or raw Markdown...' }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setMarkdownBody(editor.getHTML());
    },
  });

  const loadAllPosts = async () => {
    try {
      const data = await fetchPosts();
      setPosts(data);
      if (data.length > 0 && !selectedSlug) {
        selectPost(data[0]);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load posts' });
    }
  };

  useEffect(() => {
    loadAllPosts();
  }, []);

  const selectPost = (p: PostItem) => {
    setSelectedSlug(p.slug);
    setTitle(p.frontmatter.title || '');
    setSlug(p.frontmatter.slug || p.slug);
    setDate(p.frontmatter.date || new Date().toISOString().slice(0, 10));
    setAuthor(p.frontmatter.author || 'Admin');
    setExcerpt(p.frontmatter.excerpt || '');
    setTagsInput((p.frontmatter.tags || []).join(', '));
    setCoverImage(p.frontmatter.coverImage || '');
    setDraft(Boolean(p.frontmatter.draft));
    setMarkdownBody(p.body || '');

    if (editor) {
      editor.commands.setContent(p.body || '');
    }
    setFeedback(null);
  };

  const handleCreateNew = () => {
    const today = new Date().toISOString().slice(0, 10);
    const newSlug = `new-article-${Date.now().toString().slice(-4)}`;
    setSelectedSlug(null);
    setTitle('Untitled Article');
    setSlug(newSlug);
    setDate(today);
    setAuthor('Admin');
    setExcerpt('Brief summary of this article...');
    setTagsInput('general');
    setCoverImage('');
    setDraft(true);
    setMarkdownBody('# Untitled Article\n\nStart writing your content here...');

    if (editor) {
      editor.commands.setContent('<h1>Untitled Article</h1><p>Start writing your content here...</p>');
    }
    setFeedback(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const frontmatter: PostFrontmatter = {
      title,
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
      date,
      author,
      excerpt,
      coverImage: coverImage || undefined,
      tags,
      draft,
    };

    try {
      await savePost({
        frontmatter,
        body: markdownBody,
      });

      setFeedback({ type: 'success', message: 'Article saved and validated successfully!' });
      await loadAllPosts();
      setSelectedSlug(frontmatter.slug);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.error || 'Failed to save post',
        issues: err.issues,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slugToDelete: string) => {
    if (!window.confirm(`Are you sure you want to delete post "${slugToDelete}"?`)) {
      return;
    }

    try {
      await deletePost(slugToDelete);
      await loadAllPosts();
      if (selectedSlug === slugToDelete) {
        handleCreateNew();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete post' });
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await uploadMedia(file);
      if (res.media?.url) {
        setCoverImage(res.media.url);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to upload cover image' });
    } finally {
      setUploadingImage(false);
    }
  };

  const filteredPosts = posts.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.frontmatter.title?.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      p.frontmatter.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Posts Sidebar */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Articles ({posts.length})
            </span>
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
          {filteredPosts.map((p) => {
            const isSelected = p.slug === selectedSlug;
            return (
              <div
                key={p.slug}
                onClick={() => selectPost(p)}
                className={`p-3 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-600/10 border border-indigo-500/30 text-white'
                    : 'hover:bg-slate-800/40 text-slate-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">
                    {p.frontmatter.title}
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(p.slug);
                    }}
                    className="text-slate-600 hover:text-rose-400 p-0.5 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2 text-[10px]">
                  <span>{p.frontmatter.date}</span>
                  <span>•</span>
                  {p.frontmatter.draft ? (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-semibold">
                      Draft
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                      Live
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Editor & Frontmatter Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        {/* Workspace Top Toolbar */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/30 shrink-0">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setEditorMode('wysiwyg')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                editorMode === 'wysiwyg'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>WYSIWYG</span>
            </button>
            <button
              onClick={() => setEditorMode('markdown')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                editorMode === 'markdown'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Raw Markdown</span>
            </button>
            <button
              onClick={() => setEditorMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                editorMode === 'preview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Astro</span>
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Validating & Saving...' : 'Save Article'}</span>
          </button>
        </div>

        {/* Validation Feedback Banner */}
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
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <div className="flex-1">
              <span className="font-semibold">{feedback.message}</span>
              {feedback.issues && (
                <span className="ml-2 font-mono">
                  ({feedback.issues.map((i) => `${i.field}: ${i.message}`).join(', ')})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Editor Body */}
        <div className="flex-1 overflow-y-auto flex">
          {/* Main Editing Column */}
          <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
            {/* Title & Slug Header */}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Article Title..."
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!selectedSlug) {
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)+/g, '')
                    );
                  }
                }}
                className="w-full text-3xl sm:text-4xl font-extrabold text-white bg-transparent outline-none placeholder:text-slate-700 tracking-tight"
              />
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <span>/blog/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-indigo-400 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Frontmatter Metadata Drawer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Date (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Author
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <div className="flex items-center justify-between text-slate-400 font-medium">
                  <span>Excerpt (Max 280 chars)</span>
                  <span className={excerpt.length > 280 ? 'text-rose-400 font-bold' : ''}>
                    {excerpt.length}/280
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Tags (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="tech, astro, git"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium flex items-center justify-between">
                  <span>Draft Status</span>
                  <span className="font-mono text-indigo-400">{draft ? 'Draft' : 'Published'}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setDraft(!draft)}
                  className={`w-full py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    draft
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {draft ? 'Hidden from Production' : 'Ready for SSG Generation'}
                </button>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> Cover Image (WebP Transcoded)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="/uploads/cover.webp"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none font-mono text-xs"
                  />
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors">
                    <span>{uploadingImage ? 'Transcoding...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Editor Workspace Switcher */}
            {editorMode === 'wysiwyg' && editor && (
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/30 flex flex-col">
                {/* Tiptap Toolbar */}
                <div className="p-2 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center gap-1">
                  <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`p-1.5 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Heading1 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-1.5 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Heading2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`p-1.5 rounded ${editor.isActive('blockquote') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6 min-h-[350px] text-slate-200">
                  <EditorContent editor={editor} />
                </div>
              </div>
            )}

            {editorMode === 'markdown' && (
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/30 flex flex-col">
                <textarea
                  rows={18}
                  value={markdownBody}
                  onChange={(e) => {
                    setMarkdownBody(e.target.value);
                    if (editor) editor.commands.setContent(e.target.value);
                  }}
                  className="w-full p-6 bg-transparent text-slate-200 font-mono text-sm leading-relaxed outline-none resize-none"
                  placeholder="# Enter Markdown content directly..."
                />
              </div>
            )}

            {editorMode === 'preview' && (
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 h-[500px]">
                <iframe
                  src={`http://localhost:4321/blog/${slug}`}
                  title="Astro Live Preview"
                  className="w-full h-full border-none"
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
