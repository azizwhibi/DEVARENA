import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import WebSocket, { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import { AuthService } from '../auth/auth.service';
import { MessagingService } from './messaging.service';

export interface InboundMessagePayload {
  event: 'send_message' | 'typing';
  data: {
    conversationId: string;
    content?: string;
    isTyping?: boolean;
  };
}

@Injectable()
export class MessagingGateway
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MessagingGateway.name);
  private wss: WebSocketServer | null = null;
  private readonly userSockets = new Map<string, Set<WebSocket>>();

  constructor(
    private readonly authService: AuthService,
    private readonly messagingService: MessagingService,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  onApplicationBootstrap(): void {
    const server = this.httpAdapterHost.httpAdapter?.getHttpServer?.();
    if (!server) {
      this.logger.warn('HTTP server not available; WebSocket server not bound.');
      return;
    }

    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', async (req: IncomingMessage, socket: any, head: Buffer) => {
      try {
        const urlObj = new URL(req.url ?? '/', 'http://localhost');
        if (urlObj.pathname === '/ws' || urlObj.pathname === '/ws/chat') {
          const token =
            urlObj.searchParams.get('token') ??
            req.headers.authorization?.replace(/^Bearer\s+/i, '');

          if (!token) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }

          let user;
          try {
            user = await this.authService.authenticate(`Bearer ${token}`);
          } catch {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }

          this.wss?.handleUpgrade(req, socket, head, (ws) => {
            this.wss?.emit('connection', ws, req, user);
          });
        }
      } catch (err: unknown) {
        this.logger.error('WebSocket upgrade error', err);
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: WebSocket, _req: IncomingMessage, user?: { id: string }) => {
      if (!user?.id) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      this.registerSocket(user.id, ws);

      ws.send(
        JSON.stringify({
          event: 'authenticated',
          data: { userId: user.id },
        }),
      );

      ws.on('message', async (raw: WebSocket.RawData) => {
        try {
          const payload = JSON.parse(raw.toString('utf-8')) as InboundMessagePayload;
          await this.handleClientMessage(user.id, payload);
        } catch (err: unknown) {
          ws.send(
            JSON.stringify({
              event: 'error',
              data: { message: (err as Error).message || 'Invalid message payload' },
            }),
          );
        }
      });

      ws.on('close', () => {
        this.unregisterSocket(user.id, ws);
      });

      ws.on('error', () => {
        this.unregisterSocket(user.id, ws);
      });
    });

    this.logger.log('Native WebSocket Gateway listening on /ws');
  }

  onApplicationShutdown(): void {
    for (const [userId, sockets] of this.userSockets.entries()) {
      for (const s of sockets) {
        try {
          s.close(1001, 'Server shutting down');
        } catch {
          // ignore
        }
      }
      sockets.clear();
    }
    this.userSockets.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  private registerSocket(userId: string, ws: WebSocket): void {
    let sockets = this.userSockets.get(userId);
    if (!sockets) {
      sockets = new Set();
      this.userSockets.set(userId, sockets);
    }
    sockets.add(ws);
  }

  private unregisterSocket(userId: string, ws: WebSocket): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  notifyUser(userId: string, event: string, payload: unknown): void {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    const data = JSON.stringify({ event, data: payload });
    for (const s of sockets) {
      if (s.readyState === WebSocket.OPEN) {
        try {
          s.send(data);
        } catch {
          // socket send error handled in on('error')
        }
      }
    }
  }

  private async handleClientMessage(
    senderId: string,
    payload: InboundMessagePayload,
  ): Promise<void> {
    if (payload.event === 'send_message') {
      const { conversationId, content } = payload.data;
      if (!conversationId || !content) return;

      const saved = await this.messagingService.saveMessage(
        senderId,
        conversationId,
        content,
      );

      const participantIds =
        await this.messagingService.getConversationParticipantIds(conversationId);

      if (participantIds) {
        for (const pId of participantIds) {
          this.notifyUser(pId, 'new_message', saved);
        }
      }
    } else if (payload.event === 'typing') {
      const { conversationId, isTyping } = payload.data;
      if (!conversationId) return;

      const participantIds =
        await this.messagingService.getConversationParticipantIds(conversationId);

      if (participantIds) {
        const partnerId = participantIds.find((id) => id !== senderId);
        if (partnerId) {
          this.notifyUser(partnerId, 'user_typing', {
            conversationId,
            userId: senderId,
            isTyping: !!isTyping,
          });
        }
      }
    }
  }
}
