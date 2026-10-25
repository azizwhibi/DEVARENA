'use client';

import { useState } from 'react';
import { AlertCircle, Flag, X } from 'lucide-react';
import { reportCommunityContent } from '@/lib/community';

export function ReportModal({
  isOpen,
  onClose,
  postId,
  commentId,
}: {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  commentId?: string;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await reportCommunityContent({
        postId,
        commentId,
        reason: reason.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReason('');
        onClose();
      }, 1500);
    } catch {
      setError('Unable to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const presetReasons = [
    'Spam or misleading promotional content',
    'Harassment or disrespectful behavior',
    'Off-topic or irrelevant discussion',
    'Contains leaked private test cases or protected answers',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#16142a] border border-violet-800/40 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-100 font-semibold">
            <Flag className="w-4 h-4 text-amber-400" />
            <span>Report Content</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="py-6 text-center text-sm text-emerald-400 font-medium">
            Thank you. Your report has been submitted for moderation.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <p className="text-xs text-zinc-400">
              Please choose a reason or write why this content violates community guidelines.
            </p>

            <div className="flex flex-col gap-1.5">
              {presetReasons.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`text-left text-xs p-2.5 rounded-lg border transition-colors ${
                    reason === preset
                      ? 'border-violet-500 bg-violet-600/20 text-violet-200 font-medium'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Or write specific details..."
              rows={3}
              required
              minLength={5}
              className="w-full bg-zinc-950/70 border border-violet-900/40 rounded-lg p-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 mt-1"
            />

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !reason.trim()}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors shadow-md shadow-red-950"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
