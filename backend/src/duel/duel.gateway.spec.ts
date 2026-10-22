import { createServer, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocket } from 'ws';
import { HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { DuelServerEvent } from './duel.types';
import { DuelGateway } from './duel.gateway';
import { DuelRoomService } from './duel-room.service';
import { DuelMatchmakingService } from './duel-matchmaking.service';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';

const ids = {
  one: '11111111-1111-4111-8111-111111111111',
  two: '22222222-2222-4222-8222-222222222222',
};
type Message =
  | DuelServerEvent
  | { type: 'DUEL_AUTHENTICATED'; payload: { playerId: string } };
describe('Battle Code real WebSocket transport (isolated auth and persistence)', () => {
  let http: Server,
    gateway: DuelGateway,
    rooms: DuelRoomService,
    queue: DuelMatchmakingService,
    url: string;
  let sockets: WebSocket[], messages: Map<WebSocket, Message[]>;
  const insert = jest.fn().mockResolvedValue({ error: null });
  const supabase = {
    client: {
      from: jest.fn((table: string) =>
        table === 'duel_matches'
          ? { insert }
          : {
              select: () => ({
                eq: (_key: string, id: string) => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { username: id === ids.one ? 'Alice' : 'Bob' },
                      error: null,
                    }),
                }),
              }),
            },
      ),
    },
  };
  beforeEach(async () => {
    sockets = [];
    messages = new Map();
    insert.mockClear();
    supabase.client.from.mockClear();
    const auth = {
      authenticate: jest.fn((header: string) => {
        const token = header.replace('Bearer ', '');
        if (!(token in ids)) throw new Error('Unauthorized');
        return Promise.resolve({
          id: ids[token as keyof typeof ids],
          role: 'developer',
          status: 'active',
        });
      }),
    };
    http = createServer();
    rooms = new DuelRoomService(supabase as unknown as SupabaseService);
    queue = new DuelMatchmakingService(rooms);
    gateway = new DuelGateway(
      { httpAdapter: { getHttpServer: () => http } } as HttpAdapterHost,
      auth as unknown as AuthService,
      supabase as unknown as SupabaseService,
      queue,
      rooms,
      new ConfigService(),
    );
    gateway.onModuleInit();
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
    url = `ws://127.0.0.1:${(http.address() as AddressInfo).port}/duel`;
  });
  afterEach(async () => {
    gateway.onModuleDestroy();
    queue.onModuleDestroy();
    rooms.onModuleDestroy();
    for (const ws of sockets) ws.terminate();
    await new Promise<void>((resolve) => http.close(() => resolve()));
  });
  async function connect() {
    const ws = new WebSocket(url, { origin: 'http://localhost:3001' });
    sockets.push(ws);
    messages.set(ws, []);
    ws.on('message', (raw) =>
      messages
        .get(ws)!
        .push(
          JSON.parse(
            Buffer.isBuffer(raw) ? raw.toString('utf8') : 'null',
          ) as Message,
        ),
    );
    await new Promise<void>((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });
    return ws;
  }
  async function wait<K extends Message['type']>(
    ws: WebSocket,
    type: K,
    predicate: (message: Extract<Message, { type: K }>) => boolean = () => true,
  ) {
    const end = Date.now() + 2000;
    while (Date.now() < end) {
      const candidates = messages
        .get(ws)!
        .filter((m) => m.type === type) as Extract<Message, { type: K }>[];
      const found = candidates.find(predicate);
      if (found) return found;
      await new Promise((r) => setTimeout(r, 5));
    }
    throw new Error('Missing event ' + type);
  }
  const send = (ws: WebSocket, type: string, payload: object = {}) =>
    ws.send(JSON.stringify({ type, payload }));
  async function signedIn(token: keyof typeof ids) {
    const ws = await connect();
    send(ws, 'DUEL_AUTH', { token });
    await wait(ws, 'DUEL_AUTHENTICATED');
    return ws;
  }
  it('rejects invalid authentication without guest fallback', async () => {
    const ws = await connect();
    const closed = new Promise<number>((r) => ws.once('close', r));
    send(ws, 'DUEL_AUTH', { token: 'bad' });
    expect(await closed).toBe(4401);
    expect(queue.getQueueLength()).toBe(0);
  });
  it('rejects a second connection from the same identity', async () => {
    await signedIn('one');
    const second = await connect();
    const closed = new Promise<number>((r) => second.once('close', r));
    send(second, 'DUEL_AUTH', { token: 'one' });
    expect(await closed).toBe(4409);
  });
  it('uses authenticated identities, requires both accepts, hides answers and enforces forfeit', async () => {
    const a = await signedIn('one'),
      b = await signedIn('two');
    send(a, 'DUEL_JOIN', { playerId: ids.two, playerName: 'Spoofed' });
    expect((await wait(a, 'DUEL_QUEUE_WAITING')).payload.playerId).toBe(
      ids.one,
    );
    send(b, 'DUEL_JOIN');
    const proposal = await wait(a, 'DUEL_MATCH_PROPOSED');
    const duelId = proposal.payload.duelId;
    expect(proposal.payload.opponent.name).toBe('Bob');
    send(a, 'DUEL_MATCH_ACCEPT', { duelId });
    await wait(
      a,
      'DUEL_MATCH_ACCEPTED_UPDATE',
      (m) => m.payload.acceptedPlayerIds.length === 1,
    );
    expect(rooms.getRoom(duelId)).toBeUndefined();
    send(b, 'DUEL_MATCH_ACCEPT', { duelId });
    const round = await wait(a, 'DUEL_ROUND_START');
    await wait(b, 'DUEL_ROUND_START');
    expect(round.payload.question.correctIndex).toBeUndefined();
    expect(round.payload.totalQuestions).toBe(10);
    const correct = rooms.getRoom(duelId)!.questions[0].correctIndex;
    send(a, 'DUEL_SUBMIT_ANSWER', {
      duelId,
      roundIndex: 0,
      questionId: round.payload.question.id,
      selectedIndex: correct,
      timeRemainingMs: 999999,
    });
    const notification = await wait(b, 'DUEL_OPPONENT_ANSWERED');
    expect(notification.payload.selectedIndex).toBeUndefined();
    expect(notification.payload.timeRemainingMs).toBeLessThanOrEqual(10000);
    send(a, 'DUEL_SUBMIT_ANSWER', {
      duelId,
      roundIndex: 0,
      questionId: round.payload.question.id,
      selectedIndex: (correct + 1) % 4,
    });
    send(b, 'DUEL_SUBMIT_ANSWER', {
      duelId,
      roundIndex: 0,
      questionId: round.payload.question.id,
      selectedIndex: (correct + 1) % 4,
    });
    const resolved = await wait(b, 'DUEL_ROUND_RESOLVE');
    expect(resolved.payload.opponentResult.isCorrect).toBe(true);
    expect(resolved.payload.playerResult.pointsEarned).toBe(0);
    a.close();
    const ended = await wait(b, 'DUEL_MATCH_END');
    expect(ended.payload.winnerId).toBe(ids.two);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        player1_id: ids.one,
        player2_id: ids.two,
        winner_id: ids.two,
      }),
    );
    expect(
      supabase.client.from.mock.calls.every(([table]) =>
        ['profiles', 'duel_matches'].includes(table),
      ),
    ).toBe(true);
  });
  it('rejects foreign browser origins during the upgrade', async () => {
    const ws = new WebSocket(url, { origin: 'https://foreign.invalid' });
    sockets.push(ws);
    ws.on('error', () => {});
    const status = await new Promise<number>((resolve) =>
      ws.once('unexpected-response', (_req, response) => {
        response.resume();
        resolve(response.statusCode!);
      }),
    );
    expect(status).toBe(403);
  });
});
