import React, { useState, useEffect } from 'react';
import {
  Save,
  Trash2,
  Plus,
  Eye,
  Edit3,
  Monitor,
  Smartphone,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layout,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { fetchPages, savePage, deletePage, fetchConfig } from '../api';
import type { PageData, HeroBlock, FeaturesBlock, RichTextBlock, CtaBlock } from '../types';

export const PagesView: React.FC = () => {
  const [pages, setPages] = useState<PageData[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('home');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [pagesUrl, setPagesUrl] = useState<string | null>(null);

  // Authoring & Preview Mode
  const [authoringMode, setAuthoringMode] = useState<'editor' | 'preview'>('editor');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');

  // Form state for current page
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('home');
  const [description, setDescription] = useState('');
  const [ctaText, setCtaText] = useState('Explore');
  const [ctaLink, setCtaLink] = useState('/');

  // Feature Highlights
  const [featuresEnabled, setFeaturesEnabled] = useState(true);
  const [features, setFeatures] = useState<Array<{ icon: string; title: string; description: string }>>([
    { icon: 'Zap', title: 'Lightning Fast', description: 'Zero database latency with static edge hosting.' },
    { icon: 'Shield', title: 'Git Immutable', description: 'Complete revision audit log backed by Git.' },
    { icon: 'Globe', title: 'Dual Delivery', description: 'Static HTML pages and headless JSON APIs.' },
  ]);

  // Page Body (Markdown)
  const [markdownBody, setMarkdownBody] = useState('');

  // Preserved block IDs to prevent churn
  const [heroId, setHeroId] = useState<string>(crypto.randomUUID());
  const [featuresId, setFeaturesId] = useState<string>(crypto.randomUUID());
  const [richtextId, setRichtextId] = useState<string>(crypto.randomUUID());
  const [preservedCta, setPreservedCta] = useState<CtaBlock | null>(null);

  const loadAllPages = async () => {
    try {
      const [data, cfg] = await Promise.allSettled([fetchPages(), fetchConfig()]);
      if (data.status === 'fulfilled') {
        setPages(data.value);
        const active = data.value.find((p) => p.slug === selectedSlug) || data.value[0];
        if (active) {
          populateFormFromPage(active);
        }
      }
      if (cfg.status === 'fulfilled' && cfg.value?.pagesUrl) {
        setPagesUrl(cfg.value.pagesUrl);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load landing pages' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllPages();
  }, []);

  const populateFormFromPage = (page: PageData) => {
    setSelectedSlug(page.slug);
    setTitle(page.title || '');
    setSlug(page.slug || 'home');
    setDescription(page.description || '');

    // 1. Hero block
    const hero = page.blocks.find((b): b is HeroBlock => b.type === 'hero');
    if (hero) {
      setHeroId(hero.id);
      setTitle(page.title || hero.heading);
      if (hero.subheading) setDescription(hero.subheading);
      setCtaText(hero.ctaText || 'Explore');
      setCtaLink(hero.ctaLink || '/');
    } else {
      setHeroId(crypto.randomUUID());
    }

    // 2. Features block
    const feats = page.blocks.find((b): b is FeaturesBlock => b.type === 'features');
    if (feats && feats.items && feats.items.length > 0) {
      setFeaturesId(feats.id);
      setFeaturesEnabled(true);
      setFeatures(
        feats.items.slice(0, 3).map((it) => ({
          icon: it.icon || 'Star',
          title: it.title || '',
          description: it.description || '',
        }))
      );
    } else {
      setFeaturesEnabled(false);
      setFeaturesId(crypto.randomUUID());
    }

    // 3. Richtext block
    const rt = page.blocks.find((b): b is RichTextBlock => b.type === 'richtext');
    if (rt) {
      setRichtextId(rt.id);
      setMarkdownBody(rt.markdown || '');
    } else {
      setRichtextId(crypto.randomUUID());
      setMarkdownBody('');
    }

    // 4. Preserve existing CTA block if any
    const cta = page.blocks.find((b): b is CtaBlock => b.type === 'cta');
    setPreservedCta(cta || null);

    setFeedback(null);
  };

  const handleSelectPage = (page: PageData) => {
    populateFormFromPage(page);
  };

  const handleCreateNewPage = () => {
    const newSlug = `page-${Date.now().toString().slice(-4)}`;
    setSelectedSlug(newSlug);
    setTitle('New Landing Page');
    setSlug(newSlug);
    setDescription('A clean landing page layout for your audience.');
    setCtaText('Get Started');
    setCtaLink('/blog');
    setFeaturesEnabled(true);
    setFeatures([
      { icon: 'Zap', title: 'Feature One', description: 'Describe your first key highlight or benefit here.' },
      { icon: 'Shield', title: 'Feature Two', description: 'Describe your second key highlight or benefit here.' },
      { icon: 'Globe', title: 'Feature Three', description: 'Describe your third key highlight or benefit here.' },
    ]);
    setMarkdownBody('## About This Page\n\nAdd rich context, guidelines, or details directly in Markdown.');
    setHeroId(crypto.randomUUID());
    setFeaturesId(crypto.randomUUID());
    setRichtextId(crypto.randomUUID());
    setPreservedCta(null);
    setFeedback(null);
  };

  const handleSavePage = async () => {
    setSaving(true);
    setFeedback(null);

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'page';

    // Build block array according to schema
    const blocks: any[] = [
      {
        id: heroId,
        type: 'hero',
        heading: title.trim() || 'Welcome',
        subheading: description.trim() || 'A modern serverless web experience.',
        ctaText: ctaText.trim() || undefined,
        ctaLink: ctaLink.trim() || undefined,
        alignment: 'center',
      },
    ];

    if (featuresEnabled && features.length > 0) {
      blocks.push({
        id: featuresId,
        type: 'features',
        title: 'Key Highlights',
        items: features.map((f) => ({
          icon: f.icon || 'Star',
          title: f.title.trim() || 'Feature',
          description: f.description.trim() || '',
        })),
      });
    }

    if (markdownBody.trim()) {
      blocks.push({
        id: richtextId,
        type: 'richtext',
        markdown: markdownBody.trim(),
      });
    }

    if (preservedCta) {
      blocks.push(preservedCta);
    }

    const payload: PageData = {
      title: title.trim() || 'Untitled Page',
      slug: cleanSlug,
      description: description.trim() || 'Page description',
      updatedAt: new Date().toISOString(),
      blocks,
    };

    try {
      await savePage(payload);
      setFeedback({ type: 'success', message: `Saved page "${cleanSlug}" successfully!` });
      await loadAllPages();
      setSelectedSlug(cleanSlug);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.issues?.[0]?.message || err.error || 'Failed to validate and save page',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async () => {
    if (selectedSlug === 'home') {
      alert('The root "home" page cannot be deleted.');
      return;
    }
    if (!window.confirm(`Delete page "${selectedSlug}"? This removes the page JSON file.`)) {
      return;
    }

    try {
      await deletePage(selectedSlug);
      const remaining = pages.filter((p) => p.slug !== selectedSlug);
      setPages(remaining);
      const homePage = remaining.find((p) => p.slug === 'home') || remaining[0];
      if (homePage) {
        populateFormFromPage(homePage);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete page' });
    }
  };

  const updateFeatureItem = (index: number, field: 'title' | 'description', value: string) => {
    setFeatures((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0d0f12] text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0d0f12] text-zinc-100 overflow-hidden font-sans">
      {/* Editorial Top Bar */}
      <header className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-[#14171c]/70 backdrop-blur shrink-0 z-20">
        {/* Left: Page Switcher Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {pages.map((p) => {
            const isHome = p.slug === 'home';
            const isActive = selectedSlug === p.slug;
            return (
              <button
                key={p.slug}
                onClick={() => handleSelectPage(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <Layout className="w-3.5 h-3.5 text-zinc-400" />
                <span>{isHome ? 'Home Page' : p.slug}</span>
              </button>
            );
          })}

          <button
            onClick={handleCreateNewPage}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
            title="Create New Landing Page"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Editor / Preview Segmented Switcher */}
        <div className="flex items-center bg-[#101317] p-1 rounded-lg border border-zinc-800 text-xs">
          <button
            onClick={() => setAuthoringMode('editor')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
              authoringMode === 'editor'
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
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

        {/* Right: Actions (Delete, Notification, Save) */}
        <div className="flex items-center gap-3">
          {feedback && (
            <span
              className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 ${
                feedback.type === 'error'
                  ? 'bg-red-950/40 text-red-400 border border-red-900/40'
                  : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
              }`}
            >
              {feedback.type === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{feedback.message}</span>
            </span>
          )}

          {selectedSlug !== 'home' && (
            <button
              onClick={handleDeletePage}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800/60 transition-colors"
              title="Delete Page"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {pagesUrl && (
            <a
              href={`${pagesUrl.replace(/\/+$/, '')}/${selectedSlug === 'home' ? '' : selectedSlug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700/60 transition-colors"
              title="Open live landing page on github.io"
            >
              <span>Live on github.io</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </a>
          )}

          <button
            onClick={handleSavePage}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold shadow-sm transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Page</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Body */}
      {authoringMode === 'editor' ? (
        /* ========================================================= */
        /* MODE 1: STREAMLINED EDITOR FORM                           */
        /* ========================================================= */
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* 1. Page Header & Hero */}
            <div className="bg-[#14171c] border border-zinc-800 rounded-2xl p-6 space-y-5">
              <div className="border-b border-zinc-800/80 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Hero Section</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Primary headline, subtitle, and call-to-action button.
                  </p>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  hero block
                </span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Page Title &amp; Headline</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Compelling page headline..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#101317] border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                </div>

                {selectedSlug !== 'home' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">URL Slug</label>
                    <div className="flex items-center">
                      <span className="px-3 py-2 rounded-l-xl bg-zinc-900 border border-r-0 border-zinc-800 text-zinc-500 font-mono text-xs">
                        /
                      </span>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                        className="flex-1 px-3 py-2 rounded-r-xl bg-[#101317] border border-zinc-800 text-zinc-100 font-mono text-xs focus:outline-none focus:border-zinc-500"
                        placeholder="custom-page"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Subtitle &amp; Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Clear, descriptive subtext for your visitors..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#101317] border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">CTA Button Text</label>
                    <input
                      type="text"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="e.g. Read the Articles"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#101317] border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">CTA Button Destination</label>
                    <input
                      type="text"
                      value={ctaLink}
                      onChange={(e) => setCtaLink(e.target.value)}
                      placeholder="e.g. /blog or https://..."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#101317] border border-zinc-800 text-zinc-100 text-xs font-mono focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Key Highlights (3-Column Features Grid) */}
            <div className="bg-[#14171c] border border-zinc-800 rounded-2xl p-6 space-y-5">
              <div className="border-b border-zinc-800/80 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Key Highlights Grid</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Optional 3-column features overview displaying core value propositions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-zinc-400 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={featuresEnabled}
                      onChange={(e) => setFeaturesEnabled(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-700 text-zinc-100"
                    />
                    <span>Enable Features</span>
                  </label>
                </div>
              </div>

              {featuresEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {features.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[#101317] border border-zinc-800/80 space-y-3"
                    >
                      <span className="text-[10px] font-mono uppercase text-zinc-500">
                        Highlight {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateFeatureItem(idx, 'title', e.target.value)}
                        placeholder="Highlight Title"
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-medium focus:outline-none focus:border-zinc-600"
                      />
                      <textarea
                        rows={3}
                        value={item.description}
                        onChange={(e) => updateFeatureItem(idx, 'description', e.target.value)}
                        placeholder="Short description..."
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs focus:outline-none focus:border-zinc-600 resize-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Page Body (Markdown Editor) */}
            <div className="bg-[#14171c] border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="border-b border-zinc-800/80 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Page Body</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Markdown-powered content section for long-form explanations, FAQs, or rich text.
                  </p>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  richtext block
                </span>
              </div>

              <textarea
                rows={10}
                value={markdownBody}
                onChange={(e) => setMarkdownBody(e.target.value)}
                placeholder="## Section Heading&#10;&#10;Write formatted markdown content for this landing page directly..."
                className="w-full p-4 rounded-xl bg-[#101317] border border-zinc-800 text-zinc-200 font-mono text-xs focus:outline-none focus:border-zinc-500 leading-relaxed resize-y"
              />
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* MODE 2: LIVE PREVIEW                                      */
        /* ========================================================= */
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0f12]">
          {/* Viewport Switcher */}
          <div className="h-10 border-b border-zinc-800 px-6 flex items-center justify-between bg-[#101317] shrink-0 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span>Preview:</span>
              <span className="text-zinc-200 font-mono">/{selectedSlug === 'home' ? '' : selectedSlug}</span>
            </div>
            <div className="flex items-center bg-[#14171c] p-0.5 rounded-md border border-zinc-800">
              <button
                onClick={() => setPreviewViewport('desktop')}
                className={`p-1.5 rounded transition-all ${
                  previewViewport === 'desktop' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Desktop View"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewViewport('mobile')}
                className={`p-1.5 rounded transition-all ${
                  previewViewport === 'mobile' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Mobile View (375px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start">
            <div
              className={`transition-all bg-[#0d0f12] text-zinc-100 ${
                previewViewport === 'mobile'
                  ? 'w-[375px] min-h-[667px] border border-zinc-800 rounded-3xl p-6 shadow-2xl overflow-hidden my-4'
                  : 'w-full max-w-4xl py-12 px-8'
              }`}
            >
              {/* Rendered Hero */}
              <div className="text-center py-12 space-y-4 border-b border-zinc-800/60">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
                  {title || 'Page Headline'}
                </h1>
                <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                  {description || 'Page subtitle and description.'}
                </p>
                {ctaText && (
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-medium text-xs shadow-sm">
                      <span>{ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}
              </div>

              {/* Rendered Features Grid */}
              {featuresEnabled && features.length > 0 && (
                <div className="py-12 border-b border-zinc-800/60">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {features.map((item, idx) => (
                      <div key={idx} className="p-5 rounded-2xl bg-[#14171c] border border-zinc-800 space-y-2">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-bold font-mono">
                          0{idx + 1}
                        </div>
                        <h4 className="text-sm font-semibold text-zinc-100">{item.title || 'Feature'}</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rendered Markdown Body */}
              {markdownBody && (
                <div className="py-12 prose prose-invert max-w-none text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {markdownBody}
                </div>
              )}

              {/* Preserved CTA block if any */}
              {preservedCta && (
                <div className="mt-8 p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-3">
                  <h3 className="text-base font-semibold text-zinc-100">{preservedCta.heading}</h3>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-semibold">
                      {preservedCta.buttonText}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
