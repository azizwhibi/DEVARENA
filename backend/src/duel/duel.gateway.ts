import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import type { Server, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, WebSocket } from 'ws';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { DuelMatchmakingService } from './duel-matchmaking.service';
import { DuelRoomService } from './duel-room.service';
import { safeSend } from './duel.constants';
import type { RankPromotion } from '../rankings/rank-reward.listener';

type Session = { id: string; name: string; token: string };

// Uses the host's existing ws transport and authentication service. No source
// account controllers, guest identity fallback, or replacement auth is imported.
@Injectable()
export class DuelGateway implements OnModuleInit, OnModuleDestroy {
  private readonly server = new WebSocketServer({
    noServer: true,
    maxPayload: 8192,
  });
  private readonly sessions = new Map<WebSocket, Session>();
  private readonly accounts = new Map<string, WebSocket>();
  private http?: Server;
  private stopping = false;
  private heartbeat?: ReturnType<typeof setInterval>;
  constructor(
    private readonly adapter: HttpAdapterHost,
    private readonly auth: AuthService,
    private readonly supabase: SupabaseService,
    private readonly matchmaking: DuelMatchmakingService,
    private readonly rooms: DuelRoomService,
    private readonly config: ConfigService,
  ) {}

  private upgrade = (
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ) => {
    if (new URL(request.url ?? '/', 'http://localhost').pathname !== '/duel')
      return;
    if (
      request.headers.origin &&
      request.headers.origin !==
        (this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3001')
    ) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    this.server.handleUpgrade(request, socket, head, (ws) => this.connect(ws));
  };

  onModuleInit() {
    this.http = this.adapter.httpAdapter.getHttpServer() as Server;
    this.http.on('upgrade', this.upgrade);
    const alive = new Set<WebSocket>();
    this.server.on('connection', (ws) => {
      alive.add(ws);
      ws.on('pong', () => alive.add(ws));
      ws.on('close', () => alive.delete(ws));
    });
    this.heartbeat = setInterval(() => {
      for (const ws of this.server.clients) {
        if (!alive.delete(ws)) ws.terminate();
        else ws.ping();
      }
    }, 30_000);
    this.heartbeat.unref();
  }

  private connect(ws: WebSocket) {
    this.server.emit('connection', ws);
    let chain = Promise.resolve();
    let count = 0,
      windowStart = Date.now();
    const timeout = setTimeout(() => ws.close(4401, 'Sign in required'), 5000);
    ws.on('error', () => {});
    ws.on('close', () => {
      clearTimeout(timeout);
      const session = this.sessions.get(ws);
      if (!this.stopping) {
        this.matchmaking.removeFromQueue(ws);
        this.rooms.handlePlayerDisconnect(ws);
      }
      if (session && this.accounts.get(session.id) === ws)
        this.accounts.delete(session.id);
      this.sessions.delete(ws);
    });
    ws.on('message', (raw, binary) => {
      const receivedAt = Date.now();
      const body = Buffer.isBuffer(raw) ? raw.toString('utf8') : '';
      if (receivedAt - windowStart >= 1000) {
        count = 0;
        windowStart = receivedAt;
      }
      if (binary || ++count > 20) {
        ws.close(1008, 'Invalid request rate');
        return;
      }
      chain = chain
        .then(async () => {
          if (ws.readyState !== WebSocket.OPEN) return;
          let event: { type?: string; payload?: Record<string, unknown> };
          try {
            event = JSON.parse(body) as typeof event;
          } catch {
            this.fail(ws, 'INVALID_MESSAGE', 'Invalid battle message.');
            return;
          }
          if (!event || typeof event !== 'object') return;
          const payload = event.payload ?? {};
          if (!this.sessions.has(ws)) {
            if (
              event.type !== 'DUEL_AUTH' ||
              typeof payload.token !== 'string' ||
              payload.token.length > 6000
            ) {
              ws.close(4401, 'Sign in required');
              return;
            }
            try {
              const user = await this.auth.authenticate(
                'Bearer ' + payload.token,
              );
              if (user.role !== 'developer' && user.role !== 'admin') {
                ws.close(4403, 'Developer account required');
                return;
              }
              const { data, error } = await this.supabase.client
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .maybeSingle();
              if (error || !data || ws.readyState !== WebSocket.OPEN)
                throw new Error('Account unavailable');
              const prior = this.accounts.get(user.id);
              if (prior?.readyState === WebSocket.OPEN) {
                ws.close(4409, 'This account is already connected');
                return;
              }
              this.sessions.set(ws, {
                id: user.id,
                name: data.username,
                token: payload.token,
              });
              this.accounts.set(user.id, ws);
              clearTimeout(timeout);
              ws.send(
                JSON.stringify({
                  type: 'DUEL_AUTHENTICATED',
                  payload: { playerId: user.id, playerName: data.username },
                }),
              );
            } catch {
              ws.close(4401, 'Session unavailable. Sign in again.');
            }
            return;
          }
          const player = this.sessions.get(ws)!;
          // Reuse suspended-account, role and token checks on every state-changing message.
          try {
            const current = await this.auth.authenticate(
              'Bearer ' + player.token,
            );
            if (
              current.id !== player.id ||
              !['developer', 'admin'].includes(current.role)
            )
              throw new Error();
          } catch {
            ws.close(4401, 'Session unavailable. Sign in again.');
            return;
          }
          if (
            ws.readyState !== WebSocket.OPEN ||
            this.sessions.get(ws) !== player
          )
            return;
          switch (event.type) {
            case 'DUEL_JOIN':
            case 'DUEL_QUEUE_JOIN':
              this.matchmaking.addToQueue({
                playerId: player.id,
                playerName: player.name,
                socket: ws,
                joinedAt: new Date(),
              });
              break;
            case 'DUEL_QUEUE_LEAVE':
              this.matchmaking.removeFromQueue(ws);
              break;
            case 'DUEL_MATCH_ACCEPT':
              if (typeof payload.duelId === 'string')
                this.matchmaking.acceptMatch(payload.duelId, player.id);
              break;
            case 'DUEL_MATCH_DECLINE':
              if (typeof payload.duelId === 'string')
                this.matchmaking.declineMatch(payload.duelId, player.id);
              break;
            case 'DUEL_SUBMIT_ANSWER': {
              const room =
                typeof payload.duelId === 'string'
                  ? this.rooms.getRoom(payload.duelId)
                  : undefined;
              if (
                room &&
                payload.questionId ===
                  room.questions[room.currentRoundIndex]?.id &&
                Number.isInteger(payload.roundIndex) &&
                Number.isInteger(payload.selectedIndex)
              ) {
                this.rooms.submitAnswer(
                  room.duelId,
                  player.id,
                  payload.roundIndex as number,
                  payload.selectedIndex as number,
                  0,
                  ws,
                  receivedAt,
                );
              }
              break;
            }
            default:
              this.fail(ws, 'INVALID_MESSAGE', 'Unknown battle action.');
          }
        })
        .catch(() =>
          this.fail(
            ws,
            'BATTLE_UNAVAILABLE',
            'Battle service unavailable. Please retry.',
          ),
        );
    });
  }
  private fail(ws: WebSocket, code: string, message: string) {
    safeSend(ws, { type: 'DUEL_ERROR', payload: { code, message } });
  }
  @OnEvent('rank.promoted')
  async onRankPromoted({ userId, ...reward }: RankPromotion): Promise<void> {
    const ws = this.accounts.get(userId);
    const session = ws && this.sessions.get(ws);
    if (!ws || !session || ws.readyState !== WebSocket.OPEN) return;
    try {
      const current = await this.auth.authenticate('Bearer ' + session.token);
      if (current.id !== userId || current.role !== 'developer') throw new Error();
      if (ws.readyState === WebSocket.OPEN && this.sessions.get(ws) === session) {
        ws.send(JSON.stringify({ event: 'rank_promoted', data: reward }));
      }
    } catch {
      ws.close(4401, 'Session unavailable. Sign in again.');
    }
  }
  onModuleDestroy() {
    this.stopping = true;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.http?.off('upgrade', this.upgrade);
    for (const ws of this.server.clients) ws.close(1001, 'Server restarting');
    this.server.close();
    this.sessions.clear();
    this.accounts.clear();
  }
}
