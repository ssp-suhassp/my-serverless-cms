import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  ArrowUp,
  ArrowDown,
  Copy,
  Layout,
  Layers,
  Sparkles,
  FileText,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Upload,
} from 'lucide-react';
import { fetchPages, savePage, deletePage, uploadMedia } from '../api';
import type { PageData, PageBlock, HeroBlock, FeaturesBlock, RichTextBlock, CtaBlock } from '../types';

export const PagesView: React.FC = () => {
  const [pages, setPages] = useState<PageData[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('home');
  const [currentPage, setCurrentPage] = useState<PageData | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string; issues?: any[] } | null>(null);

  const loadAllPages = async () => {
    try {
      const data = await fetchPages();
      setPages(data);
      const active = data.find((p) => p.slug === selectedSlug) || data[0];
      if (active) {
        setSelectedSlug(active.slug);
        setCurrentPage(active);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load landing pages' });
    }
  };

  useEffect(() => {
    loadAllPages();
  }, []);

  const handleSelectPage = (page: PageData) => {
    setSelectedSlug(page.slug);
    setCurrentPage(page);
    setFeedback(null);
  };

  const handleCreateNewPage = () => {
    const newSlug = `page-${Date.now().toString().slice(-4)}`;
    const newPage: PageData = {
      title: 'New Landing Page',
      slug: newSlug,
      description: 'Describe this custom landing page...',
      updatedAt: new Date().toISOString(),
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'hero',
          heading: 'Fresh Modern Experience',
          subheading: 'Customize this block to communicate your vision.',
          ctaText: 'Get Started',
          ctaLink: '/',
          alignment: 'center',
        },
      ],
    };
    setCurrentPage(newPage);
    setSelectedSlug(newSlug);
    setFeedback(null);
  };

  const handleSavePage = async () => {
    if (!currentPage) return;
    setSaving(true);
    setFeedback(null);

    const payload: PageData = {
      ...currentPage,
      updatedAt: new Date().toISOString(),
    };

    try {
      await savePage(payload);
      setFeedback({ type: 'success', message: `Page "${payload.slug}" saved successfully!` });
      await loadAllPages();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.error || 'Failed to validate and save page',
        issues: err.issues,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async (slugToDelete: string) => {
    if (slugToDelete === 'home') {
      alert('The root "home" page cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete page "${slugToDelete}"?`)) {
      return;
    }
    try {
      await deletePage(slugToDelete);
      await loadAllPages();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete page' });
    }
  };

  // Block Operations
  const addBlock = (type: PageBlock['type']) => {
    if (!currentPage) return;
    const newId = crypto.randomUUID();
    let newBlock: PageBlock;

    switch (type) {
      case 'hero':
        newBlock = {
          id: newId,
          type: 'hero',
          heading: 'New Hero Headline',
          subheading: 'Compelling subheadline describing the offer or concept.',
          ctaText: 'Learn More',
          ctaLink: '/blog',
          alignment: 'center',
        };
        break;
      case 'features':
        newBlock = {
          id: newId,
          type: 'features',
          title: 'Key Capabilities',
          items: [
            { icon: 'speed', title: 'Lightning Fast', description: 'Pre-rendered static HTML delivery.' },
            { icon: 'shield', title: 'Zero Cloud DB', description: 'Git-backed immutable content store.' },
            { icon: 'api', title: 'RESTful JSON', description: 'Static JSON API generated on build.' },
          ],
        };
        break;
      case 'richtext':
        newBlock = {
          id: newId,
          type: 'richtext',
          markdown: '## Deep Dive\n\nAdd full Markdown content directly in this modular section.',
        };
        break;
      case 'cta':
        newBlock = {
          id: newId,
          type: 'cta',
          heading: 'Start Building With Serverless GitCMS Today',
          buttonText: 'Read Documentation',
          buttonUrl: '/blog',
        };
        break;
    }

    setCurrentPage({
      ...currentPage,
      blocks: [...currentPage.blocks, newBlock],
    });
  };

  const updateBlock = (index: number, updatedBlock: PageBlock) => {
    if (!currentPage) return;
    const newBlocks = [...currentPage.blocks];
    newBlocks[index] = updatedBlock;
    setCurrentPage({ ...currentPage, blocks: newBlocks });
  };

  const removeBlock = (index: number) => {
    if (!currentPage) return;
    const newBlocks = currentPage.blocks.filter((_, i) => i !== index);
    setCurrentPage({ ...currentPage, blocks: newBlocks });
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (!currentPage) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentPage.blocks.length) return;

    const newBlocks = [...currentPage.blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
    setCurrentPage({ ...currentPage, blocks: newBlocks });
  };

  const duplicateBlock = (index: number) => {
    if (!currentPage) return;
    const sourceBlock = currentPage.blocks[index];
    const clone = { ...sourceBlock, id: crypto.randomUUID() };
    const newBlocks = [...currentPage.blocks];
    newBlocks.splice(index + 1, 0, clone);
    setCurrentPage({ ...currentPage, blocks: newBlocks });
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Pages Sidebar */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Landing Pages ({pages.length})
          </span>
          <button
            onClick={handleCreateNewPage}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Page</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {pages.map((p) => {
            const isSelected = p.slug === selectedSlug;
            return (
              <div
                key={p.slug}
                onClick={() => handleSelectPage(p)}
                className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-indigo-600/10 border border-indigo-500/30 text-white'
                    : 'hover:bg-slate-800/40 text-slate-400'
                }`}
              >
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">{p.title}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {p.slug === 'home' ? '/' : `/${p.slug}`} ({p.blocks.length} blocks)
                  </span>
                </div>
                {p.slug !== 'home' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePage(p.slug);
                    }}
                    className="text-slate-600 hover:text-rose-400 p-1 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Block Stack Canvas */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        {/* Workspace Top Toolbar */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/30 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white">{currentPage?.title || 'Landing Page'}</h2>
            <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {currentPage?.slug === 'home' ? '/' : `/${currentPage?.slug}`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Block</span>
              </button>
              <div className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden py-1 hidden group-hover:block z-30">
                <button
                  onClick={() => addBlock('hero')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Hero Section
                </button>
                <button
                  onClick={() => addBlock('features')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2"
                >
                  <Layers className="w-3.5 h-3.5" /> Features Grid
                </button>
                <button
                  onClick={() => addBlock('richtext')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5" /> Rich Text / MD
                </button>
                <button
                  onClick={() => addBlock('cta')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2"
                >
                  <Megaphone className="w-3.5 h-3.5" /> CTA Banner
                </button>
              </div>
            </div>

            <button
              onClick={handleSavePage}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Page'}</span>
            </button>
          </div>
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
            <div>
              <span className="font-semibold">{feedback.message}</span>
              {feedback.issues && (
                <span className="ml-2 font-mono">
                  ({feedback.issues.map((i) => `${i.field}: ${i.message}`).join(', ')})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Page Content & Blocks List */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
          {/* Page Metadata Card */}
          {currentPage && (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Page Title</label>
                <input
                  type="text"
                  value={currentPage.title}
                  onChange={(e) => setCurrentPage({ ...currentPage, title: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">URL Slug</label>
                <input
                  type="text"
                  disabled={currentPage.slug === 'home'}
                  value={currentPage.slug}
                  onChange={(e) => setCurrentPage({ ...currentPage, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none font-mono disabled:opacity-50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-400 font-medium block mb-1">Description (SEO)</label>
                <input
                  type="text"
                  value={currentPage.description}
                  onChange={(e) => setCurrentPage({ ...currentPage, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Block Stack Cards */}
          <div className="space-y-4">
            {currentPage?.blocks.map((block, index) => (
              <div
                key={block.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-4"
              >
                {/* Block Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/20">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {block.type} Block
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveBlock(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveBlock(index, 'down')}
                      disabled={index === (currentPage.blocks.length - 1)}
                      className="p-1 rounded text-slate-500 hover:text-white disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => duplicateBlock(index)}
                      className="p-1 rounded text-slate-500 hover:text-white"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeBlock(index)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Specific Block Editors */}
                {block.type === 'hero' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="text-slate-400 block mb-1">Heading</label>
                      <input
                        type="text"
                        value={block.heading}
                        onChange={(e) => updateBlock(index, { ...block, heading: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-slate-400 block mb-1">Subheading</label>
                      <textarea
                        rows={2}
                        value={block.subheading}
                        onChange={(e) => updateBlock(index, { ...block, subheading: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">CTA Button Text</label>
                      <input
                        type="text"
                        value={block.ctaText || ''}
                        onChange={(e) => updateBlock(index, { ...block, ctaText: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">CTA Button Link</label>
                      <input
                        type="text"
                        value={block.ctaLink || ''}
                        onChange={(e) => updateBlock(index, { ...block, ctaLink: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none"
                      />
                    </div>
                  </div>
                )}

                {block.type === 'features' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Section Title</label>
                      <input
                        type="text"
                        value={block.title}
                        onChange={(e) => updateBlock(index, { ...block, title: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-slate-400 block">Feature Items ({block.items.length})</label>
                      {block.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-3">
                          <input
                            type="text"
                            placeholder="icon"
                            value={item.icon}
                            onChange={(e) => {
                              const newItems = [...block.items];
                              newItems[itemIdx] = { ...item, icon: e.target.value };
                              updateBlock(index, { ...block, items: newItems });
                            }}
                            className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300"
                          />
                          <input
                            type="text"
                            placeholder="Feature Title"
                            value={item.title}
                            onChange={(e) => {
                              const newItems = [...block.items];
                              newItems[itemIdx] = { ...item, title: e.target.value };
                              updateBlock(index, { ...block, items: newItems });
                            }}
                            className="w-40 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300"
                          />
                          <input
                            type="text"
                            placeholder="Feature Description"
                            value={item.description}
                            onChange={(e) => {
                              const newItems = [...block.items];
                              newItems[itemIdx] = { ...item, description: e.target.value };
                              updateBlock(index, { ...block, items: newItems });
                            }}
                            className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {block.type === 'richtext' && (
                  <div className="text-xs">
                    <label className="text-slate-400 block mb-1">Markdown Body</label>
                    <textarea
                      rows={5}
                      value={block.markdown}
                      onChange={(e) => updateBlock(index, { ...block, markdown: e.target.value })}
                      className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono outline-none"
                    />
                  </div>
                )}

                {block.type === 'cta' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="text-slate-400 block mb-1">CTA Heading</label>
                      <input
                        type="text"
                        value={block.heading}
                        onChange={(e) => updateBlock(index, { ...block, heading: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Button Text</label>
                      <input
                        type="text"
                        value={block.buttonText}
                        onChange={(e) => updateBlock(index, { ...block, buttonText: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Button URL</label>
                      <input
                        type="text"
                        value={block.buttonUrl}
                        onChange={(e) => updateBlock(index, { ...block, buttonUrl: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
