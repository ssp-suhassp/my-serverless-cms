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
  FileEdit,
  Tag,
  Upload,
  Calendar,
  User,
  Settings as SettingsIcon,
  ChevronLeft,
  X,
  ExternalLink,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Code,
  Link as LinkIcon,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { fetchPosts, savePost, deletePost, uploadMedia } from '../api';
import { htmlToMarkdown, markdownToHtml } from '../utils/markdown';
import type { PostItem, PostFrontmatter } from '../types';

interface PostsViewProps {
  onPublishTrigger?: () => void;
}

export const PostsView: React.FC<PostsViewProps> = ({ onPublishTrigger }) => {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDraft, setFilterDraft] = useState<'all' | 'published' | 'draft'>('all');

  // Editor View State
  const [authoringMode, setAuthoringMode] = useState<'editor' | 'preview'>('editor');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Post State
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
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Initialize Tiptap
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension.configure({ inline: true }),
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Begin writing your story...' }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setMarkdownBody(htmlToMarkdown(editor.getHTML()));
    },
  });

  const loadAllPosts = async () => {
    try {
      const data = await fetchPosts();
      setPosts(data);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to load posts' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllPosts();
  }, []);

  const handleSelectPost = (p: PostItem) => {
    setSelectedPost(p);
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
      editor.commands.setContent(markdownToHtml(p.body || ''));
    }
    setAuthoringMode('editor');
    setIsSettingsOpen(false);
    setNotification(null);
  };

  const handleCreateNew = () => {
    const today = new Date().toISOString().slice(0, 10);
    const newSlug = `new-story-${Date.now().toString().slice(-4)}`;
    const newPostItem: PostItem = {
      slug: newSlug,
      frontmatter: {
        title: '',
        slug: newSlug,
        date: today,
        author: 'Admin',
        excerpt: '',
        tags: [],
        draft: true,
      },
      body: '',
    };

    setSelectedPost(newPostItem);
    setTitle('');
    setSlug(newSlug);
    setDate(today);
    setAuthor('Admin');
    setExcerpt('');
    setTagsInput('');
    setCoverImage('');
    setDraft(true);
    setMarkdownBody('');

    if (editor) {
      editor.commands.setContent('');
    }
    setAuthoringMode('editor');
    setIsSettingsOpen(false);
    setNotification(null);
  };

  const handleSave = async (draftOverride?: boolean) => {
    setSaving(true);
    setNotification(null);

    const isDraftVal = draftOverride !== undefined ? draftOverride : draft;
    if (draftOverride !== undefined) {
      setDraft(draftOverride);
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') || `story-${Date.now()}`;
    const frontmatter: PostFrontmatter = {
      title: title.trim() || 'Untitled Story',
      slug: cleanSlug,
      date,
      author,
      excerpt,
      coverImage: coverImage || undefined,
      tags,
      draft: isDraftVal,
    };

    const bodyToSave = editor ? htmlToMarkdown(editor.getHTML()) : markdownBody;

    try {
      await savePost({
        frontmatter,
        body: bodyToSave,
      });

      setNotification({
        type: 'success',
        text: isDraftVal ? 'Draft saved locally.' : 'Story published to local Git repository.',
      });
      await loadAllPosts();
      setSlug(cleanSlug);
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.issues?.[0]?.message || err.error || 'Failed to save post.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slugToDelete: string) => {
    if (!window.confirm(`Delete post "${slugToDelete}"? This removes the Markdown file.`)) {
      return;
    }

    try {
      await deletePost(slugToDelete);
      await loadAllPosts();
      if (selectedPost?.slug === slugToDelete) {
        setSelectedPost(null);
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to delete post' });
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
      setNotification({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleInsertEditorImage = () => {
    const url = window.prompt('Enter image URL or local asset path (e.g., /uploads/image.webp):');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const filteredPosts = posts.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      p.frontmatter.title?.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      p.frontmatter.tags?.some((t) => t.toLowerCase().includes(q));

    if (filterDraft === 'published') return matchesQuery && !p.frontmatter.draft;
    if (filterDraft === 'draft') return matchesQuery && p.frontmatter.draft;
    return matchesQuery;
  });

  // =========================================================================
  // VIEW 1: Post Index List (Ghost Style Table)
  // =========================================================================
  if (!selectedPost) {
    return (
      <div className="flex-1 flex flex-col bg-[#0d0f12] overflow-hidden">
        {/* Header Bar */}
        <div className="h-16 border-b border-zinc-800/80 px-8 flex items-center justify-between bg-[#14171c]/50">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-semibold text-zinc-100">Posts</h1>
            <div className="flex items-center gap-1 bg-[#101317] p-1 rounded-lg border border-zinc-800 text-xs">
              <button
                onClick={() => setFilterDraft('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterDraft === 'all'
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All ({posts.length})
              </button>
              <button
                onClick={() => setFilterDraft('published')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterDraft === 'published'
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Published
              </button>
              <button
                onClick={() => setFilterDraft('draft')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterDraft === 'draft'
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Drafts
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#101317] border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
              />
            </div>
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New post</span>
            </button>
          </div>
        </div>

        {/* Posts Table */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {filteredPosts.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <p className="text-zinc-400 text-sm">No posts found matching your criteria.</p>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
              >
                Create your first story
              </button>
            </div>
          ) : (
            <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-[#14171c]/30">
              <div className="divide-y divide-zinc-800/60">
                {filteredPosts.map((post) => (
                  <div
                    key={post.slug}
                    onClick={() => handleSelectPost(post)}
                    className="p-4 hover:bg-[#181c22] cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div className="space-y-1 min-w-0 flex-1 pr-6">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-medium text-zinc-100 truncate group-hover:text-white">
                          {post.frontmatter.title || 'Untitled Post'}
                        </h3>
                        {post.frontmatter.draft ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40 uppercase tracking-wider">
                            Draft
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 uppercase tracking-wider">
                            Published
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-1 font-sans">
                        {post.frontmatter.excerpt || post.body?.slice(0, 120) || 'No excerpt available.'}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono pt-0.5">
                        <span>{post.frontmatter.date}</span>
                        <span>•</span>
                        <span>By {post.frontmatter.author || 'Admin'}</span>
                        {post.frontmatter.tags && post.frontmatter.tags.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-zinc-400">{post.frontmatter.tags.join(', ')}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(post.slug);
                        }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800/60 transition-colors"
                        title="Delete post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: Distraction-Free Editor & Preview Canvas
  // =========================================================================
  return (
    <div className="flex-1 flex flex-col bg-[#0d0f12] overflow-hidden relative">
      {/* Editorial Header Bar */}
      <header className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-[#14171c]/70 backdrop-blur shrink-0 z-20">
        {/* Left: Back & Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedPost(null)}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 transition-colors py-1 px-1.5 rounded hover:bg-zinc-800/60"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Posts</span>
          </button>
          <span className="text-zinc-600">/</span>
          <span className="text-xs text-zinc-300 font-mono truncate max-w-xs">
            {slug}
          </span>
          {draft ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40 uppercase">
              Draft
            </span>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 uppercase">
              Published
            </span>
          )}
        </div>

        {/* Center: Editor / Preview Mode Switcher */}
        <div className="flex items-center bg-[#101317] p-1 rounded-lg border border-zinc-800 text-xs">
          <button
            onClick={() => setAuthoringMode('editor')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
              authoringMode === 'editor'
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
          <button
            onClick={() => setAuthoringMode('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
              authoringMode === 'preview'
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {authoringMode === 'preview' && (
            <div className="flex items-center bg-[#101317] p-1 rounded-lg border border-zinc-800 text-xs mr-2">
              <button
                onClick={() => setPreviewViewport('desktop')}
                className={`p-1 rounded ${previewViewport === 'desktop' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'}`}
                title="Desktop viewport"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewViewport('mobile')}
                className={`p-1 rounded ${previewViewport === 'mobile' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'}`}
                title="Mobile viewport"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm transition-all"
          >
            <span>Publish</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-1.5 rounded-lg border transition-colors ${
              isSettingsOpen
                ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            title="Post Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`px-6 py-2.5 border-b text-xs flex items-center justify-between ${
            notification.type === 'error'
              ? 'bg-red-950/40 border-red-900/50 text-red-300'
              : 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-zinc-400 hover:text-zinc-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Canvas */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {authoringMode === 'editor' ? (
            /* ======================================================== */
            /* Ghost Style Editor Canvas                               */
            /* ======================================================== */
            <div className="max-w-3xl w-full mx-auto px-6 py-12 space-y-6">
              {/* Document Title */}
              <input
                type="text"
                placeholder="Story Title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (selectedPost && selectedPost.slug.startsWith('new-story-')) {
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)+/g, '')
                    );
                  }
                }}
                className="w-full text-4xl font-bold text-zinc-100 bg-transparent border-none outline-none placeholder:text-zinc-600 tracking-tight"
              />

              {/* Minimal Formatting Rail */}
              {editor && (
                <div className="sticky top-2 z-10 p-1 rounded-lg bg-[#14171c]/95 backdrop-blur border border-zinc-800 flex items-center gap-1 w-fit shadow-md">
                  <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-1.5 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
                    title="Heading 2"
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`p-1.5 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
                    title="Heading 3"
                  >
                    <Heading3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
                    title="Bullet list"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
                    title="Numbered list"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`p-1.5 rounded ${editor.isActive('blockquote') ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
                    title="Blockquote"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleInsertEditorImage}
                    className="p-1.5 rounded text-zinc-400 hover:text-zinc-200"
                    title="Insert Image"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Tiptap Canvas */}
              {editor && (
                <div className="min-h-[450px]">
                  <EditorContent editor={editor} />
                </div>
              )}
            </div>
          ) : (
            /* ======================================================== */
            /* Preview Canvas (Desktop & Mobile Frames)                */
            /* ======================================================== */
            <div className="flex-1 flex items-center justify-center p-6 bg-[#090b0e]">
              <div
                className={`bg-[#14171c] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 flex flex-col ${
                  previewViewport === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full max-w-4xl h-full'
                }`}
              >
                <div className="h-9 bg-[#101317] border-b border-zinc-800 px-4 flex items-center justify-between text-xs text-zinc-500 font-mono">
                  <span>http://localhost:4321/blog/{slug}</span>
                  <a
                    href={`http://localhost:4321/blog/${slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-zinc-300 flex items-center gap-1"
                  >
                    <span>Open External</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <iframe
                  src={`http://localhost:4321/blog/${slug}`}
                  title="Astro Preview"
                  className="w-full flex-1 border-none bg-[#0d0f12]"
                />
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* Post Settings Slide-Out Drawer                          */}
        {/* ======================================================== */}
        {isSettingsOpen && (
          <aside className="w-80 border-l border-zinc-800/80 bg-[#14171c] p-6 overflow-y-auto space-y-6 shadow-xl shrink-0">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-sm font-semibold text-zinc-100">Post Settings</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* URL Slug */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Post URL Slug</label>
              <div className="flex items-center">
                <span className="px-2.5 py-1.5 bg-[#101317] border border-r-0 border-zinc-800 rounded-l-lg text-zinc-500 text-xs font-mono">
                  /blog/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                  className="flex-1 px-2.5 py-1.5 bg-[#101317] border border-zinc-800 rounded-r-lg text-xs font-mono text-zinc-200 outline-none focus:border-zinc-600"
                />
              </div>
            </div>

            {/* Publish Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>Publish Date</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#101317] border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none focus:border-zinc-600"
              />
            </div>

            {/* Author */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>Author</span>
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#101317] border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none focus:border-zinc-600"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-400" />
                <span>Tags (comma-separated)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="tech, serverless, cms"
                className="w-full px-3 py-1.5 bg-[#101317] border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none focus:border-zinc-600"
              />
            </div>

            {/* Excerpt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                <span>Excerpt</span>
                <span className={excerpt.length > 280 ? 'text-red-400' : 'text-zinc-500'}>
                  {excerpt.length}/280
                </span>
              </div>
              <textarea
                rows={3}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Write a brief preview summary..."
                className="w-full px-3 py-1.5 bg-[#101317] border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none focus:border-zinc-600"
              />
            </div>

            {/* Featured Image */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-zinc-400" />
                <span>Feature Cover Image</span>
              </label>
              <input
                type="text"
                placeholder="/uploads/cover.webp"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#101317] border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 outline-none focus:border-zinc-600"
              />
              <label className="cursor-pointer block text-center py-2 px-3 rounded-lg border border-dashed border-zinc-700 hover:border-zinc-500 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                <span>{uploadingImage ? 'Transcoding WebP...' : 'Upload Image (Auto-WebP)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Delete Action */}
            <div className="pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => handleDelete(selectedPost.slug)}
                className="w-full py-2 px-3 rounded-lg bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-950/60 text-xs font-medium transition-colors"
              >
                Delete this post
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
