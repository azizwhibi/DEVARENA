import { MessagingGateway } from './messaging.gateway';
import type { AuthService } from '../auth/auth.service';
import type { MessagingService } from './messaging.service';
import type { HttpAdapterHost } from '@nestjs/core';

describe('MessagingGateway', () => {
  let gateway: MessagingGateway;
  let mockAuthService: Partial<AuthService>;
  let mockMessagingService: Partial<MessagingService>;
  let mockHttpAdapterHost: Partial<HttpAdapterHost>;

  beforeEach(() => {
    mockAuthService = {
      authenticate: jest.fn(),
    };
    mockMessagingService = {
      saveMessage: jest.fn(),
      getConversationParticipantIds: jest.fn(),
    };
    mockHttpAdapterHost = {
      httpAdapter: {
        getHttpServer: jest.fn().mockReturnValue({
          on: jest.fn(),
        }),
      } as any,
    };

    gateway = new MessagingGateway(
      mockAuthService as AuthService,
      mockMessagingService as MessagingService,
      mockHttpAdapterHost as HttpAdapterHost,
    );
  });

  describe('notifyUser', () => {
    it('sends JSON serialized payload to connected user socket', () => {
      const mockWs = {
        readyState: 1, // OPEN
        send: jest.fn(),
      };

      (gateway as any).userSockets.set('user-123', new Set([mockWs]));

      gateway.notifyUser('user-123', 'invitation_received', { id: 'inv-1' });

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          event: 'invitation_received',
          data: { id: 'inv-1' },
        }),
      );
    });

    it('gracefully does nothing if user has no active socket', () => {
      expect(() => {
        gateway.notifyUser('unknown-user', 'test_event', {});
      }).not.toThrow();
    });
  });

  describe('handleMessageEvent', () => {
    it('saves message and broadcasts new_message to both participants', async () => {
      const senderId = 'user-1';
      const recipientId = 'user-2';
      const conversationId = 'conv-100';

      (mockMessagingService.getConversationParticipantIds as jest.Mock).mockResolvedValueOnce([
        senderId,
        recipientId,
      ]);

      const mockSaved = {
        id: 'msg-99',
        conversationId,
        senderId,
        content: 'Hello via websocket',
        createdAt: new Date().toISOString(),
      };
      (mockMessagingService.saveMessage as jest.Mock).mockResolvedValueOnce(mockSaved);

      const senderWs = { readyState: 1, send: jest.fn() };
      const recipientWs = { readyState: 1, send: jest.fn() };

      (gateway as any).userSockets.set(senderId, new Set([senderWs]));
      (gateway as any).userSockets.set(recipientId, new Set([recipientWs]));

      await (gateway as any).handleClientMessage(senderId, {
        event: 'send_message',
        data: { conversationId, content: 'Hello via websocket' },
      });

      expect(mockMessagingService.saveMessage).toHaveBeenCalledWith(
        senderId,
        conversationId,
        'Hello via websocket',
      );

      const expectedPayload = JSON.stringify({
        event: 'new_message',
        data: mockSaved,
      });

      expect(senderWs.send).toHaveBeenCalledWith(expectedPayload);
      expect(recipientWs.send).toHaveBeenCalledWith(expectedPayload);
    });

    it('broadcasts user_typing only to partner in conversation', async () => {
      const senderId = 'user-1';
      const partnerId = 'user-2';
      const conversationId = 'conv-200';

      (mockMessagingService.getConversationParticipantIds as jest.Mock).mockResolvedValueOnce([
        senderId,
        partnerId,
      ]);

      const senderWs = { readyState: 1, send: jest.fn() };
      const partnerWs = { readyState: 1, send: jest.fn() };

      (gateway as any).userSockets.set(senderId, new Set([senderWs]));
      (gateway as any).userSockets.set(partnerId, new Set([partnerWs]));

      await (gateway as any).handleClientMessage(senderId, {
        event: 'typing',
        data: { conversationId, isTyping: true },
      });

      expect(senderWs.send).not.toHaveBeenCalled();
      expect(partnerWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          event: 'user_typing',
          data: { conversationId, userId: senderId, isTyping: true },
        }),
      );
    });

    it('ignores send_message if conversationId or content is missing', async () => {
      await (gateway as any).handleClientMessage('user-1', {
        event: 'send_message',
        data: { conversationId: '', content: '' },
      });

      expect(mockMessagingService.saveMessage).not.toHaveBeenCalled();
    });

    it('unregisters socket correctly on close', () => {
      const ws1 = { readyState: 1, send: jest.fn() } as any;
      const ws2 = { readyState: 1, send: jest.fn() } as any;

      (gateway as any).registerSocket('user-1', ws1);
      (gateway as any).registerSocket('user-1', ws2);

      expect((gateway as any).userSockets.get('user-1').size).toBe(2);

      (gateway as any).unregisterSocket('user-1', ws1);
      expect((gateway as any).userSockets.get('user-1').size).toBe(1);

      (gateway as any).unregisterSocket('user-1', ws2);
      expect((gateway as any).userSockets.has('user-1')).toBe(false);
    });
  });
});
