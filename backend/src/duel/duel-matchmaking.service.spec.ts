import { Test, TestingModule } from '@nestjs/testing';
import type { WebSocket } from 'ws';
import { DuelMatchmakingService } from './duel-matchmaking.service';
import { DuelRoomService } from './duel-room.service';

import { SupabaseService } from '../supabase/supabase.service';

describe('DuelMatchmakingService', () => {
  let matchmakingService: DuelMatchmakingService;
  let roomService: DuelRoomService;

  const createMockSocket = (id: string): WebSocket => {
    return {
      readyState: 1, // OPEN
      send: jest.fn(),
      id,
    } as unknown as WebSocket;
  };

  beforeEach(async () => {
    jest.useFakeTimers();

    const mockSupabase = {
      client: {
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null }),
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: { id: 'uuid-1', xp: 100 }, error: null }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuelMatchmakingService,
        DuelRoomService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    matchmakingService = module.get<DuelMatchmakingService>(
      DuelMatchmakingService,
    );
    roomService = module.get<DuelRoomService>(DuelRoomService);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should queue a single player without matching', () => {
    const socket = createMockSocket('s1');
    const result = matchmakingService.addToQueue({
      playerId: 'p1',
      playerName: 'Player One',
      socket,
      joinedAt: new Date(),
    });

    expect(result.matched).toBe(false);
    expect(matchmakingService.getQueueLength()).toBe(1);
    expect(socket.send).toHaveBeenCalledWith(
      expect.stringContaining('DUEL_QUEUE_WAITING'),
    );
  });

  it('should propose match to 2 distinct players and await confirmation before starting round 1', () => {
    const s1 = createMockSocket('s1');
    const s2 = createMockSocket('s2');

    matchmakingService.addToQueue({
      playerId: 'p1',
      playerName: 'Alice',
      socket: s1,
      joinedAt: new Date(),
    });

    const result = matchmakingService.addToQueue({
      playerId: 'p2',
      playerName: 'Bob',
      socket: s2,
      joinedAt: new Date(),
    });

    expect(result.matched).toBe(true);
    expect(result.duelId).toBeDefined();
    expect(matchmakingService.getQueueLength()).toBe(0);

    const duelId = result.duelId!;
    expect(matchmakingService.getProposedMatch(duelId)).toBeDefined();

    // Both players should receive DUEL_MATCH_FOUND and DUEL_MATCH_PROPOSED
    expect(s1.send).toHaveBeenCalledWith(
      expect.stringContaining('DUEL_MATCH_FOUND'),
    );
    expect(s2.send).toHaveBeenCalledWith(
      expect.stringContaining('DUEL_MATCH_FOUND'),
    );
    expect(s1.send).toHaveBeenCalledWith(
      expect.stringContaining('DUEL_MATCH_PROPOSED'),
    );
    expect(s2.send).toHaveBeenCalledWith(
      expect.stringContaining('DUEL_MATCH_PROPOSED'),
    );

    // DUEL_ROUND_START must NOT be sent before acceptance
    expect(s1.send).not.toHaveBeenCalledWith(
      expect.stringContaining('DUEL_ROUND_START'),
    );
    expect(s2.send).not.toHaveBeenCalledWith(
      expect.stringContaining('DUEL_ROUND_START'),
    );

    // Player 1 accepts
    matchmakingService.acceptMatch(duelId, 'p1');
    expect(s1.send).toHaveBeenCalledWith(
      expect.stringContaining('DUEL_MATCH_ACCEPTED_UPDATE'),
    );

    // Player 2 accepts -> starts round 1!
    matchmakingService.acceptMatch(duelId, 'p2');
    expect(s1.send).toHaveBeenCalledWith(
      expect.stringContaining('DUEL_ROUND_START'),
    );
    expect(s2.send).toHaveBeenCalledWith(
      expect.stringContaining('DUEL_ROUND_START'),
    );

    const room = roomService.getRoom(duelId);
    expect(room).toBeDefined();
    expect(room?.questions.length).toBe(10);
    expect(room?.player1.name).toBe('Alice');
    expect(room?.player2.name).toBe('Bob');
  });

  it('should cancel match and re-queue other player when one player declines', () => {
    const s1 = createMockSocket('s1');
    const s2 = createMockSocket('s2');

    matchmakingService.addToQueue({
      playerId: 'p1',
      playerName: 'Alice',
      socket: s1,
      joinedAt: new Date(),
    });

    const result = matchmakingService.addToQueue({
      playerId: 'p2',
      playerName: 'Bob',
      socket: s2,
      joinedAt: new Date(),
    });

    const duelId = result.duelId!;
    matchmakingService.declineMatch(duelId, 'p1');

    // Both receive cancel event
    expect(s1.send).toHaveBeenCalledWith(
      expect.stringContaining('DUEL_MATCH_CANCELLED'),
    );
    expect(s2.send).toHaveBeenCalledWith(
      expect.stringContaining('DUEL_MATCH_CANCELLED'),
    );

    // Bob (p2) must be re-queued at the front of queue
    expect(matchmakingService.getQueueLength()).toBe(1);
    expect(matchmakingService.isPlayerInQueue('p2')).toBe(true);
    // Alice (p1) who declined is NOT in queue
    expect(matchmakingService.isPlayerInQueue('p1')).toBe(false);
  });

  it('should cancel match on 10s timeout and only re-queue player who accepted', () => {
    const s1 = createMockSocket('s1');
    const s2 = createMockSocket('s2');

    matchmakingService.addToQueue({
      playerId: 'p1',
      playerName: 'Alice',
      socket: s1,
      joinedAt: new Date(),
    });

    const result = matchmakingService.addToQueue({
      playerId: 'p2',
      playerName: 'Bob',
      socket: s2,
      joinedAt: new Date(),
    });

    const duelId = result.duelId!;
    // Alice accepts, Bob does not (AFK)
    matchmakingService.acceptMatch(duelId, 'p1');

    // Advance timers by 10s (ACCEPT_TIMEOUT_MS)
    jest.advanceTimersByTime(10_000);

    expect(s1.send).toHaveBeenCalledWith(
      expect.stringContaining('DUEL_MATCH_CANCELLED'),
    );
    expect(s2.send).toHaveBeenCalledWith(
      expect.stringContaining('DUEL_MATCH_CANCELLED'),
    );

    // Alice had accepted, so she is re-queued
    expect(matchmakingService.isPlayerInQueue('p1')).toBe(true);
    // Bob was AFK, so he is NOT re-queued
    expect(matchmakingService.isPlayerInQueue('p2')).toBe(false);
  });

  it('should safely remove player from queue when disconnected', () => {
    const s1 = createMockSocket('s1');
    matchmakingService.addToQueue({
      playerId: 'p1',
      playerName: 'Alice',
      socket: s1,
      joinedAt: new Date(),
    });

    expect(matchmakingService.getQueueLength()).toBe(1);

    const removed = matchmakingService.removeFromQueue(s1);
    expect(removed).toBe(true);
    expect(matchmakingService.getQueueLength()).toBe(0);
  });

  it('should not match the same player twice if re-submitting', () => {
    const s1 = createMockSocket('s1');
    matchmakingService.addToQueue({
      playerId: 'p1',
      playerName: 'Alice',
      socket: s1,
      joinedAt: new Date(),
    });

    const duplicateResult = matchmakingService.addToQueue({
      playerId: 'p1',
      playerName: 'Alice',
      socket: s1,
      joinedAt: new Date(),
    });

    expect(duplicateResult.matched).toBe(false);
    expect(matchmakingService.getQueueLength()).toBe(1);
  });
});
