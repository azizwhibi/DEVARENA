'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  acceptInvitation,
  declineInvitation,
  listReceivedInvitations,
  listSentInvitations,
  type InvitationItem,
} from '@/lib/messaging';

interface InvitationsManagerProps {
  role?: 'developer' | 'recruiter' | 'admin';
}

export function InvitationsManager({ role = 'developer' }: InvitationsManagerProps) {
  const isRecruiterOrAdmin = role === 'recruiter' || role === 'admin';
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  const [received, setReceived] = useState<InvitationItem[]>([]);
  const [sent, setSent] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const receivedData = await listReceivedInvitations(controller.signal);
        if (controller.signal.aborted) return;
        setReceived(receivedData || []);

        if (isRecruiterOrAdmin) {
          const sentData = await listSentInvitations(controller.signal);
          if (controller.signal.aborted) return;
          setSent(sentData || []);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Could not load invitations.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadData();

    function handleRealtimeEvent() {
      void loadData();
    }

    window.addEventListener('invitation-received', handleRealtimeEvent);
    window.addEventListener('invitation-status-changed', handleRealtimeEvent);

    return () => {
      controller.abort();
      window.removeEventListener('invitation-received', handleRealtimeEvent);
      window.removeEventListener('invitation-status-changed', handleRealtimeEvent);
    };
  }, [isRecruiterOrAdmin]);

  const handleAccept = async (id: string) => {
    setActionLoadingId(id);
    setActionNotice(null);
    try {
      await acceptInvitation(id);
      setReceived((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'accepted' } : item)),
      );
      setActionNotice('Invitation accepted! A real-time chat channel is now connected.');
      window.dispatchEvent(new CustomEvent('invitation-status-changed'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (id: string) => {
    setActionLoadingId(id);
    setActionNotice(null);
    try {
      await declineInvitation(id);
      setReceived((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'declined' } : item)),
      );
      setActionNotice('Invitation declined.');
      window.dispatchEvent(new CustomEvent('invitation-status-changed'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to decline invitation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const currentList = activeTab === 'received' ? received : sent;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Interview Requests & Connections
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Manage interview invitations and direct candidate-recruiter messaging channels.
            </p>
          </div>
          <Link
            href="/messages"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-primary"
          >
            Open Live Messages →
          </Link>
        </div>

        {/* Tab switchers if recruiter */}
        {isRecruiterOrAdmin && (
          <div className="mt-6 flex border-b border-zinc-800 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('received')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 px-3 ${
                activeTab === 'received'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Received Requests ({received.filter((i) => i.status === 'pending').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sent')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 px-3 ${
                activeTab === 'sent'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sent Invitations ({sent.length})
            </button>
          </div>
        )}
      </div>

      {actionNotice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-4 text-sm font-medium text-emerald-300 flex items-center justify-between"
        >
          <span>✓ {actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-xs text-emerald-400 hover:text-emerald-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-4" aria-busy="true">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-3"
            >
              <div className="h-5 w-40 bg-zinc-800 rounded" />
              <div className="h-4 w-72 bg-zinc-800/60 rounded" />
            </div>
          ))}
        </div>
      ) : currentList.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-12 text-center text-sm text-zinc-400">
          {activeTab === 'received'
            ? 'No interview requests received yet. When a recruiter reaches out, you will find their invitation here.'
            : 'You have not sent any interview invitations yet. Explore candidates in the Recruiter Candidate Hub.'}
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map((inv) => {
            const isTargetPending = inv.status === 'pending';
            const isAccepted = inv.status === 'accepted';
            const partnerName =
              activeTab === 'received'
                ? inv.recruiter?.username ?? 'Recruiter'
                : inv.candidate?.username ?? 'Developer';
            const partnerRole = activeTab === 'received' ? 'Recruiter' : 'Candidate Developer';
            const partnerInstitution =
              activeTab === 'received' ? inv.recruiter?.institution : inv.candidate?.institution;

            return (
              <div
                key={inv.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 transition-colors hover:border-zinc-700 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-100">@{partnerName}</span>
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 font-mono">
                        {partnerRole}
                      </span>
                      {partnerInstitution && (
                        <span className="text-xs text-zinc-500">· {partnerInstitution}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      Sent {new Date(inv.createdAt).toLocaleDateString()} at{' '}
                      {new Date(inv.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isAccepted ? (
                      <span className="rounded-full bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                        Connected ✓
                      </span>
                    ) : inv.status === 'declined' ? (
                      <span className="rounded-full bg-zinc-800/80 border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-400">
                        Declined
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-950/80 border border-amber-800/80 px-2.5 py-1 text-xs font-semibold text-amber-300">
                        Pending Request
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Body */}
                {inv.message && (
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 text-sm text-zinc-300 leading-relaxed italic">
                    &ldquo;{inv.message}&rdquo;
                  </div>
                )}

                {/* Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/60 pt-4">
                  <span className="text-xs text-zinc-500">
                    {isAccepted
                      ? 'WebSocket messaging activated'
                      : 'Review terms before connecting'}
                  </span>

                  <div className="flex items-center gap-3">
                    {activeTab === 'received' && isTargetPending && (
                      <>
                        <button
                          type="button"
                          disabled={actionLoadingId === inv.id}
                          onClick={() => handleDecline(inv.id)}
                          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          disabled={actionLoadingId === inv.id}
                          onClick={() => handleAccept(inv.id)}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                        >
                          {actionLoadingId === inv.id ? 'Connecting…' : 'Accept Request'}
                        </button>
                      </>
                    )}

                    {isAccepted && (
                      <Link
                        href="/messages"
                        className="rounded-lg bg-emerald-950 border border-emerald-800 px-3.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        Connect in Chat →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
