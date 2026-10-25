'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  listConversations,
  type ConversationItem,
} from '@/lib/messaging';
import { useWebSocketChat } from '@/hooks/useWebSocketChat';

interface ChatWorkspaceProps {
  currentUserId: string;
  initialConversationId?: string | null;
}

export function ChatWorkspace({
  currentUserId,
  initialConversationId,
}: ChatWorkspaceProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [loadingConvs, setLoadingConvs] = useState<boolean>(true);
  const [inputText, setInputText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load conversations on mount
  useEffect(() => {
    const controller = new AbortController();

    listConversations(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setConversations(items);
          if (items.length > 0) {
            setSelectedConvId((prev) => prev ?? items[0].id);
          }
        }
      })
      .catch(() => {
        // non-fatal
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingConvs(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  const activeConversation = conversations.find((c) => c.id === selectedConvId) ?? null;

  const {
    isConnected,
    messages,
    partnerTyping,
    loadingHistory,
    sendMessage,
    sendTyping,
  } = useWebSocketChat({
    conversationId: selectedConvId,
    onNewMessage: (msg) => {
      // Update snippet in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? { ...c, lastMessage: msg, updatedAt: msg.createdAt }
            : c,
        ),
      );
    },
  });

  // Scroll to bottom whenever messages array changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setInputText('');
    sendTyping(false);
    try {
      await sendMessage(text);
    } catch {
      setInputText(text); // restore on error
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    sendTyping(e.target.value.length > 0);
  };

  return (
    <div className="flex flex-col md:flex-row h-[75vh] min-h-[550px] rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
      {/* Sidebar: Conversations List */}
      <aside className="w-full md:w-80 border-r border-zinc-800 bg-zinc-900/40 flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-100">Live Channels</h2>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] text-zinc-400 font-mono">
              {isConnected ? 'WS Connected' : 'Connecting'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
          {loadingConvs ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="animate-pulse space-y-2">
                  <div className="h-4 w-28 bg-zinc-800 rounded" />
                  <div className="h-3 w-44 bg-zinc-800/60 rounded" />
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 space-y-3">
              <p>No active conversations yet.</p>
              <p>
                Connect with candidates via the{' '}
                <Link href="/recruiter" className="text-primary underline">
                  Candidate Hub
                </Link>{' '}
                or accept pending requests in{' '}
                <Link href="/invitations" className="text-primary underline">
                  Requests
                </Link>
                .
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.id === selectedConvId;
              const other = conv.otherParticipant;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`w-full text-left p-4 transition-colors flex items-start gap-3 ${
                    isSelected
                      ? 'bg-zinc-800/70 border-l-2 border-primary'
                      : 'hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300 shrink-0">
                    {other.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-zinc-200 truncate">
                        @{other.username}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono uppercase">
                        {other.role}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400 truncate">
                      {conv.lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Pane */}
      <section className="flex-1 flex flex-col bg-zinc-950 min-w-0">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
                  {activeConversation.otherParticipant.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    @{activeConversation.otherParticipant.username}
                    <span className="text-[10px] rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-400 font-normal">
                      {activeConversation.otherParticipant.role}
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Real-time WebSocket Session
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span className="text-xs text-zinc-400">
                  {isConnected ? 'Live' : 'Connecting'}
                </span>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingHistory ? (
                <div className="text-center text-xs text-zinc-500 py-6">
                  Loading message history…
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs text-zinc-500 py-12 space-y-2">
                  <p>This is the start of your real-time conversation.</p>
                  <p className="text-zinc-600">Send a greeting message to start connecting.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.senderId === currentUserId;
                  const time = new Date(m.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                          isMine
                            ? 'bg-primary text-zinc-950 font-medium rounded-br-xs'
                            : 'bg-zinc-800/90 text-zinc-100 border border-zinc-700/60 rounded-bl-xs'
                        }`}
                      >
                        {m.content}
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-1 px-1">{time}</span>
                    </div>
                  );
                })
              )}

              {/* Partner typing indicator */}
              {partnerTyping && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 italic py-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" />
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]" />
                  <span>@{activeConversation.otherParticipant.username} is typing…</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <form
              onSubmit={handleSend}
              className="p-3 border-t border-zinc-800 bg-zinc-900/40 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message @${activeConversation.otherParticipant.username}…`}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 transition-opacity"
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl font-bold text-primary">
              💬
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">
              No Channel Selected
            </h3>
            <p className="max-w-sm text-xs text-zinc-500">
              Select a candidate or recruiter channel from the left sidebar to start live WebSocket messaging.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
