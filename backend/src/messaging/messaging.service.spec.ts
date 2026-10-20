import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import type { SupabaseService } from '../supabase/supabase.service';

describe('MessagingService', () => {
  let service: MessagingService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      client: {
        from: jest.fn(),
      },
    };
    service = new MessagingService(mockSupabase as SupabaseService);
  });

  describe('saveMessage', () => {
    const senderId = 'user-1';
    const conversationId = 'conv-1';
    const content = 'Hello world!';

    it('throws NotFoundException if conversation does not exist or user is not a participant', async () => {
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      await expect(
        service.saveMessage(senderId, conversationId, content),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user is not a participant', async () => {
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: {
                id: conversationId,
                participant_one_id: 'user-2',
                participant_two_id: 'user-3',
              },
              error: null,
            }),
          }),
        }),
      });

      await expect(
        service.saveMessage(senderId, conversationId, content),
      ).rejects.toThrow(ForbiddenException);
    });

    it('saves message and updates conversation updated_at', async () => {
      // 1. Conversation lookup
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: {
                id: conversationId,
                participant_one_id: senderId,
                participant_two_id: 'user-2',
              },
              error: null,
            }),
          }),
        }),
      });

      // 2. Insert message
      const savedMsg = {
        id: 'msg-1',
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        created_at: new Date().toISOString(),
      };
      mockSupabase.client.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: savedMsg,
              error: null,
            }),
          }),
        }),
      });

      // 3. Update conversation updated_at
      mockSupabase.client.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce({ error: null }),
        }),
      });

      const res = await service.saveMessage(senderId, conversationId, content);
      expect(res.id).toBe('msg-1');
      expect(res.content).toBe(content);
      expect(res.senderId).toBe(senderId);
    });
  });

  describe('getConversationMessages', () => {
    const userId = 'user-1';
    const conversationId = 'conv-1';

    it('throws NotFoundException if conversation not found or user is not participant', async () => {
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      await expect(
        service.getConversationMessages(userId, conversationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns messages chronologically when user is participant', async () => {
      // 1. Conversation check
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: {
                id: conversationId,
                participant_one_id: userId,
                participant_two_id: 'user-2',
              },
              error: null,
            }),
          }),
        }),
      });

      // 2. Messages fetch
      const rows = [
        {
          id: 'msg-1',
          conversation_id: conversationId,
          sender_id: 'user-2',
          content: 'Hello',
          created_at: '2026-10-20T10:00:00Z',
        },
        {
          id: 'msg-2',
          conversation_id: conversationId,
          sender_id: userId,
          content: 'Hi there',
          created_at: '2026-10-20T10:01:00Z',
        },
      ];
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            order: jest.fn().mockReturnValueOnce({
              limit: jest.fn().mockResolvedValueOnce({
                data: rows,
                error: null,
              }),
            }),
          }),
        }),
      });

      const messages = await service.getConversationMessages(userId, conversationId);
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Hello');
      expect(messages[1].content).toBe('Hi there');
    });

    it('gracefully returns memory messages when PostgREST returns PGRST205', async () => {
      service.registerMemoryConversation('conv-mem', 'inv-1', userId, 'user-2');

      // 1. saveMessage tries inserting into Supabase
      mockSupabase.client.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: null,
              error: {
                code: 'PGRST205',
                message: "Could not find the table 'public.messages' in the schema cache",
              },
            }),
          }),
        }),
      });

      // Save a message into memory
      await service.saveMessage(userId, 'conv-mem', 'Hello in memory!');

      // 2. getConversationMessages tries querying Supabase
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            order: jest.fn().mockReturnValueOnce({
              limit: jest.fn().mockResolvedValueOnce({
                data: null,
                error: {
                  code: 'PGRST205',
                  message: "Could not find the table 'public.messages' in the schema cache",
                },
              }),
            }),
          }),
        }),
      });

      const messages = await service.getConversationMessages(userId, 'conv-mem');
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello in memory!');
    });
  });
});
