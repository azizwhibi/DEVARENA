'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle,
  EyeOff,
  Flag,
  FolderPlus,
  Layers,
  Lock,
  MessageSquare,
  Pin,
  Plus,
  Shield,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { CommunityCategory, CommunityReport } from '@/lib/community';
import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminReports,
  getCommunityCategories,
  moderatePost,
  reviewAdminReport,
} from '@/lib/community';

export default function AdminCommunityPage() {
  const [tab, setTab] = useState<'reports' | 'categories'>('reports');

  // Reports state
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  // Categories state
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [reps, cats] = await Promise.all([
        getAdminReports('pending'),
        getCommunityCategories(),
      ]);
      setReports(reps);
      setCategories(cats);
    } catch {
      // ignore
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDismissReport = async (reportId: string) => {
    try {
      await reviewAdminReport(reportId, {
        status: 'dismissed',
        reviewNotes: 'Dismissed by moderator',
      });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setMessage('Report dismissed.');
    } catch {
      setError('Failed to dismiss report.');
    }
  };

  const handleHideContent = async (report: CommunityReport) => {
    if (!report.post_id) return;
    try {
      await moderatePost(report.post_id, {
        status: 'hidden',
        reason: `Content hidden following report: ${report.reason}`,
      });
      await reviewAdminReport(report.id, {
        status: 'reviewed',
        reviewNotes: 'Content hidden',
      });
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      setMessage('Post hidden and report resolved.');
    } catch {
      setError('Failed to hide content.');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !catSlug.trim()) return;
    setAddingCat(true);
    setError('');
    try {
      const created = await createAdminCategory({
        name: catName.trim(),
        slug: catSlug.trim().toLowerCase().replace(/\s+/g, '-'),
        description: catDesc.trim(),
      });
      setCategories((prev) => [...prev, created]);
      setCatName('');
      setCatSlug('');
      setCatDesc('');
      setMessage('Category created successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to create category.');
    } finally {
      setAddingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Deactivate this category?')) return;
    try {
      await deleteAdminCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setMessage('Category deactivated.');
    } catch {
      setError('Failed to deactivate category.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full p-4 sm:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-violet-900/30 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Community Moderation
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Review reported community content, manage categories, lock discussions and enforce forum guidelines.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-[#151329] p-1 rounded-xl border border-violet-900/40 text-xs">
          <button
            type="button"
            onClick={() => setTab('reports')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium transition-colors ${
              tab === 'reports'
                ? 'bg-violet-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Reports Queue ({reports.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('categories')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium transition-colors ${
              tab === 'categories'
                ? 'bg-violet-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Categories ({categories.length})</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Reports Queue Tab */}
      {tab === 'reports' && (
        <div className="flex flex-col gap-4">
          {reportsLoading ? (
            <div className="h-32 bg-violet-950/20 rounded-xl animate-pulse" />
          ) : reports.length === 0 ? (
            <div className="p-12 text-center bg-[#151329]/50 border border-violet-900/20 rounded-2xl flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <h3 className="text-sm font-semibold text-zinc-200">
                All clean! No pending reports
              </h3>
              <p className="text-xs text-zinc-500">
                Any flagged posts or comments will appear here for administrator review.
              </p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="bg-[#151329]/70 border border-violet-900/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                      Flagged {report.post_id ? 'Post' : 'Comment'}
                    </span>
                    <span className="text-zinc-500">
                      Reported on {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-zinc-200">
                    Reason: "{report.reason}"
                  </div>
                  {report.post_id && (
                    <Link
                      href={`/community/${report.post_id}`}
                      className="text-xs text-violet-400 hover:text-violet-300 underline"
                      target="_blank"
                    >
                      View target post →
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDismissReport(report.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Dismiss</span>
                  </button>
                  {report.post_id && (
                    <button
                      type="button"
                      onClick={() => handleHideContent(report)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-red-600 text-white hover:bg-red-500 transition-colors shadow-md shadow-red-950"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide Content</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Categories Management Tab */}
      {tab === 'categories' && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* List of categories */}
          <div className="flex-1 w-full flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
              Active Discussion Categories
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-[#151329]/70 border border-violet-900/30 rounded-xl p-4 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">{cat.name}</div>
                    <div className="text-xs text-violet-400 font-mono mt-0.5">
                      /{cat.slug}
                    </div>
                    {cat.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Category Form */}
          <form
            onSubmit={handleCreateCategory}
            className="w-full lg:w-80 bg-[#151329]/70 border border-violet-900/30 rounded-2xl p-5 flex flex-col gap-4 shrink-0 shadow-xl"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <FolderPlus className="w-4 h-4 text-violet-400" />
              <span>Add New Category</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Category Name</label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => {
                  setCatName(e.target.value);
                  if (!catSlug) {
                    setCatSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  }
                }}
                placeholder="e.g. AI & Machine Learning"
                className="w-full bg-zinc-950 border border-violet-900/40 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Slug (URL friendly)</label>
              <input
                type="text"
                required
                value={catSlug}
                onChange={(e) => setCatSlug(e.target.value)}
                placeholder="e.g. ai-ml"
                className="w-full bg-zinc-950 border border-violet-900/40 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Description</label>
              <textarea
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                rows={2}
                placeholder="Brief description..."
                className="w-full bg-zinc-950 border border-violet-900/40 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
              />
            </div>

            <button
              type="submit"
              disabled={addingCat || !catName.trim() || !catSlug.trim()}
              className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-50 shadow-md shadow-violet-900/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Category</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
