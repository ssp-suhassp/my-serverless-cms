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
    if (!window.confirm(`Delete page "${slugToDelete}"?`)) return;

    try {
      await deletePage(slugToDelete);
      await loadAllPages();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete page' });
    }
  };

  const addBlock = (type: PageBlock['type']) => {
    if (!currentPage) return;
    let newBlock: PageBlock;

    if (type === 'hero') {
      newBlock = {
        id: crypto.randomUUID(),
        type: 'hero',
        heading: 'Compelling Headline',
        subheading: 'Clear descriptive subtext for your visitors.',
        ctaText: 'Explore More',
        ctaLink: '#features',
        alignment: 'center',
      };
    } else if (type === 'features') {
      newBlock = {
        id: crypto.randomUUID(),
        type: 'features',
        title: 'Core Highlights',
        items: [
          { icon: 'Zap', title: 'Lightning Speed', description: 'Zero database latency with static edge hosting.' },
          { icon: 'Shield', title: 'Immutable Security', description: 'Complete revision history protected by Git.' },
        ],
      };
    } else if (type === 'richtext') {
      newBlock = {
        id: crypto.randomUUID(),
        type: 'richtext',
        markdown: '## Deep Dive Section\n\nWrite markdown directly into this structured page block.',
      };
    } else {
      newBlock = {
        id: crypto.randomUUID(),
        type: 'cta',
        heading: 'Ready to build with serverless CMS?',
        buttonText: 'Get Started',
        buttonUrl: 'https://github.com',
      };
    }

    setCurrentPage({
      ...currentPage,
      blocks: [...currentPage.blocks, newBlock],
    });
  };

  const updateBlock = (index: number, updated: PageBlock) => {
    if (!currentPage) return;
    const newBlocks = [...currentPage.blocks];
    newBlocks[index] = updated;
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
    const original = currentPage.blocks[index];
    const clone: PageBlock = {
      ...original,
      id: crypto.randomUUID(),
    };
    const newBlocks = [...currentPage.blocks];
    newBlocks.splice(index + 1, 0, clone);
    setCurrentPage({ ...currentPage, blocks: newBlocks });
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0d0f12]">
      {/* Pages Sidebar */}
      <aside className="w-80 border-r border-zinc-800/80 bg-[#14171c]/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Pages ({pages.length})
          </span>
          <button
            onClick={handleCreateNewPage}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-all"
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
                    ? 'bg-zinc-800 text-zinc-100 font-medium border border-zinc-700/60'
                    : 'hover:bg-zinc-800/50 text-zinc-400'
                }`}
              >
                <div>
                  <h4 className="text-xs font-medium text-zinc-200">{p.title}</h4>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {p.slug === 'home' ? '/' : `/${p.slug}`} ({p.blocks.length} blocks)
                  </span>
                </div>
                {p.slug !== 'home' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePage(p.slug);
                    }}
                    className="text-zinc-600 hover:text-red-400 p-1 rounded transition-colors"
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
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0d0f12]">
        {/* Workspace Top Toolbar */}
        <div className="h-16 border-b border-zinc-800/80 px-8 flex items-center justify-between bg-[#14171c]/50 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-zinc-100">{currentPage?.title || 'Landing Page'}</h2>
            <span className="text-xs font-mono text-zinc-500 bg-[#101317] px-2 py-0.5 rounded border border-zinc-800">
              {currentPage?.slug === 'home' ? '/' : `/${currentPage?.slug}`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14171c] hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Block</span>
              </button>
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#14171c] border border-zinc-800 rounded-xl shadow-xl overflow-hidden py-1 hidden group-hover:block z-30">
                <button
                  onClick={() => addBlock('hero')}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Hero Section
                </button>
                <button
                  onClick={() => addBlock('features')}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <Layers className="w-3.5 h-3.5" /> Features Grid
                </button>
                <button
                  onClick={() => addBlock('richtext')}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5" /> Rich Text / MD
                </button>
                <button
                  onClick={() => addBlock('cta')}
                  className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <Megaphone className="w-3.5 h-3.5" /> CTA Banner
                </button>
              </div>
            </div>

            <button
              onClick={handleSavePage}
              disabled={saving}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium shadow-sm transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Page'}</span>
            </button>
          </div>
        </div>

        {/* Validation Feedback Banner */}
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
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-6">
          {/* Page Metadata Card */}
          {currentPage && (
            <div className="p-4 rounded-xl bg-[#14171c] border border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-zinc-400 font-medium block mb-1">Page Title</label>
                <input
                  type="text"
                  value={currentPage.title}
                  onChange={(e) => setCurrentPage({ ...currentPage, title: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#101317] border border-zinc-800 text-zinc-200 outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-medium block mb-1">URL Slug</label>
                <input
                  type="text"
                  disabled={currentPage.slug === 'home'}
                  value={currentPage.slug}
                  onChange={(e) => setCurrentPage({ ...currentPage, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#101317] border border-zinc-800 text-zinc-200 outline-none font-mono disabled:opacity-50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-zinc-400 font-medium block mb-1">Description (SEO)</label>
                <input
                  type="text"
                  value={currentPage.description}
                  onChange={(e) => setCurrentPage({ ...currentPage, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#101317] border border-zinc-800 text-zinc-200 outline-none focus:border-zinc-500"
                />
              </div>
            </div>
          )}

          {/* Block Stack Cards */}
          <div className="space-y-4">
            {currentPage?.blocks.map((block, index) => (
              <div
                key={block.id}
                className="p-5 rounded-xl bg-[#14171c] border border-zinc-800 shadow-sm space-y-4"
              >
                {/* Block Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-[11px] font-mono">
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                      {block.type} Block
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveBlock(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveBlock(index, 'down')}
                      disabled={index === (currentPage.blocks.length - 1)}
                      className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => duplicateBlock(index)}
                      className="p-1 rounded text-zinc-500 hover:text-white"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeBlock(index)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400"
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
                      <label className="text-zinc-400 block mb-1">Heading</label>
                      <input
                        type="text"
                        value={block.heading}
                        onChange={(e) => updateBlock(index, { ...block, heading: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#101317] border border-zinc-800 text-zinc-200 outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-zinc-400 block mb-1">Subheading</label>
                      <textarea
                        rows={2}
                        value={block.subheading}
                        onChange={(e) => updateBlock(index, { ...block, subheading: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#101317] border border-zinc-800 text-zinc-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">CTA Button Text</label>
                      <input
                        type="text"
                        value={block.ctaText || ''}
                        onChange={(e) => updateBlock(index, { ...block, ctaText: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#101317] border border-zinc-800 text-zinc-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">CTA Button Link</label>
                      <input
                        type="text"
                        value={block.ctaLink || ''}
                        onChange={(e) => updateBlock(index, { ...block, ctaLink: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#101317] border border-zinc-800 text-zinc-200 outline-none"
                      />
                    </div>
                  </div>
                )}

                {block.type === 'features' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-zinc-400 block mb-1">Section Title</label>
                      <input
                        type="text"
                        value={block.title}
                        onChange={(e) => updateBlock(index, { ...block, title: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#101317] border border-zinc-800 text-zinc-200 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-zinc-400 block">Feature Items ({block.items.length})</label>
                      {block.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="p-3 rounded-lg bg-[#101317] border border-zinc-800 flex items-start gap-3">
                          <input
                            type="text"
                            placeholder="icon"
                            value={item.icon}
                            onChange={(e) => {
                              const newItems = [...block.items];
                              newItems[itemIdx] = { ...item, icon: e.target.value };
                              updateBlock(index, { ...block, items: newItems });
                            }}
                            className="w-20 px-2 py-1 rounded bg-[#14171c] border border-zinc-800 text-zinc-300 font-mono text-[11px]"
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
                            className="w-40 px-2 py-1 rounded bg-[#14171c] border border-zinc-800 text-zinc-300"
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
                            className="flex-1 px-2 py-1 rounded bg-[#14171c] border border-zinc-800 text-zinc-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {block.type === 'richtext' && (
                  <div className="text-xs">
                    <label className="text-zinc-400 block mb-1">Markdown Body</label>
                    <textarea
                      rows={5}
                      value={block.markdown}
                      onChange={(e) => updateBlock(index, { ...block, markdown: e.target.value })}
                      className="w-full p-3 rounded-lg bg-[#101317] border border-zinc-800 text-zinc-200 font-mono outline-none"
                    />
                  </div>
                )}

                {block.type === 'cta' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="text-zinc-400 block mb-1">CTA Heading</label>
                      <input
                        type="text"
                        value={block.heading}
                        onChange={(e) => updateBlock(index, { ...block, heading: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#101317] border border-zinc-800 text-zinc-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Button Text</label>
                      <input
                        type="text"
                        value={block.buttonText}
                        onChange={(e) => updateBlock(index, { ...block, buttonText: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#101317] border border-zinc-800 text-zinc-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Button URL</label>
                      <input
                        type="text"
                        value={block.buttonUrl}
                        onChange={(e) => updateBlock(index, { ...block, buttonUrl: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[#101317] border border-zinc-800 text-zinc-200 outline-none"
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
