'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getConversationMessages,
  sendMessageRest,
  type MessageItem,
} from '@/lib/messaging';

interface UseWebSocketChatOptions {
  conversationId?: string | null;
  onNewMessage?: (msg: MessageItem) => void;
  onInvitationReceived?: (inv: unknown) => void;
}

export function useWebSocketChat({
  conversationId,
  onNewMessage,
  onInvitationReceived,
}: UseWebSocketChatOptions = {}) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [partnerTyping, setPartnerTyping] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Load initial history when conversation changes
  useEffect(() => {
    if (!conversationId) return;

    const controller = new AbortController();

    getConversationMessages(conversationId, controller.signal)
      .then((history) => {
        if (!controller.signal.aborted) {
          setMessages(history);
          setLoadingHistory(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadingHistory(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [conversationId]);

  // 2. Establish WebSocket connection with Supabase JWT
  useEffect(() => {
    let unmounted = false;

    async function connectSocket() {
      if (unmounted) return;

      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setIsConnected(false);
        return;
      }

      const apiBase =
        process.env.NEXT_PUBLIC_WS_URL ||
        (process.env.NEXT_PUBLIC_API_URL
          ? process.env.NEXT_PUBLIC_API_URL.replace(/^http/i, 'ws').replace(/\/$/, '') + '/ws'
          : 'ws://localhost:3000/ws');

      const wsUrl = `${apiBase}?token=${encodeURIComponent(token)}`;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (unmounted) return;
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          if (unmounted) return;
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.event === 'new_message') {
              const msg: MessageItem = parsed.data;
              if (onNewMessage) onNewMessage(msg);
              if (msg.conversationId === conversationId) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === msg.id)) return prev;
                  return [...prev, msg];
                });
              }
            } else if (parsed.event === 'user_typing') {
              if (parsed.data.conversationId === conversationId) {
                setPartnerTyping(parsed.data.isTyping);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                if (parsed.data.isTyping) {
                  typingTimeoutRef.current = setTimeout(() => {
                    setPartnerTyping(false);
                  }, 3000);
                }
              }
            } else if (parsed.event === 'invitation_received') {
              if (onInvitationReceived) onInvitationReceived(parsed.data);
              window.dispatchEvent(
                new CustomEvent('invitation-received', { detail: parsed.data }),
              );
            } else if (parsed.event === 'invitation_status_changed') {
              window.dispatchEvent(
                new CustomEvent('invitation-status-changed', { detail: parsed.data }),
              );
            }
          } catch {
            // non-json or ping frames
          }
        };

        ws.onclose = () => {
          if (unmounted) return;
          setIsConnected(false);
          // Auto reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSocket();
          }, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (!unmounted) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSocket();
          }, 3000);
        }
      }
    }

    void connectSocket();

    return () => {
      unmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [conversationId, onNewMessage, onInvitationReceived]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || !conversationId) return;

      const ws = socketRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            event: 'send_message',
            data: { conversationId, content: trimmed },
          }),
        );
      } else {
        // Fallback to REST endpoint if WebSocket is temporarily buffering/reconnecting
        const saved = await sendMessageRest(conversationId, trimmed);
        setMessages((prev) => {
          if (prev.some((m) => m.id === saved.id)) return prev;
          return [...prev, saved];
        });
      }
    },
    [conversationId],
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!conversationId) return;
      const ws = socketRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            event: 'typing',
            data: { conversationId, isTyping },
          }),
        );
      }
    },
    [conversationId],
  );

  return {
    isConnected,
    messages,
    partnerTyping,
    loadingHistory,
    sendMessage,
    sendTyping,
  };
}
