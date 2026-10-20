import { Test, TestingModule } from '@nestjs/testing';
import type { WebSocket } from 'ws';
import { DuelRoomService } from './duel-room.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('DuelRoomService', () => {
  let roomService: DuelRoomService;
  let mockSupabase: any;

  const createMockSocket = (): WebSocket => {
    return {
      readyState: 1,
      send: jest.fn(),
    } as unknown as WebSocket;
  };

  beforeEach(async () => {
    jest.useFakeTimers();

    mockSupabase = {
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
        DuelRoomService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    roomService = module.get<DuelRoomService>(DuelRoomService);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should create room with 10 questions and correct player states', () => {
    const s1 = createMockSocket();
    const s2 = createMockSocket();

    const room = roomService.createRoom(
      'duel-123',
      { playerId: 'p1', playerName: 'Player 1', socket: s1, joinedAt: new Date() },
      { playerId: 'p2', playerName: 'Player 2', socket: s2, joinedAt: new Date() },
    );

    expect(room.duelId).toBe('duel-123');
    expect(room.questions.length).toBe(10);
    expect(room.player1.id).toBe('p1');
    expect(room.player2.id).toBe('p2');
    expect(roomService.getRoom('duel-123')).toBe(room);
  });

  it('should notify opponent without revealing selectedIndex on submitAnswer', () => {
    const s1 = createMockSocket();
    const s2 = createMockSocket();

    roomService.createRoom(
      'duel-123',
      { playerId: 'p1', playerName: 'Alice', socket: s1, joinedAt: new Date() },
      { playerId: 'p2', playerName: 'Bob', socket: s2, joinedAt: new Date() },
    );

    roomService.startRound('duel-123', 0);

    // Alice answers
    roomService.submitAnswer('duel-123', 'p1', 0, 1, 8000);

    // Bob should receive DUEL_OPPONENT_ANSWERED without Alice's selectedIndex (masked)
    expect(s2.send).toHaveBeenCalledWith(
      expect.stringContaining('DUEL_OPPONENT_ANSWERED'),
    );
    const lastBobCall = (s2.send as jest.Mock).mock.calls.find((call) =>
      call[0].includes('DUEL_OPPONENT_ANSWERED'),
    );
    const parsed = JSON.parse(lastBobCall[0]);
    expect(parsed.payload.opponentId).toBe('p1');
    expect(parsed.payload.timeRemainingMs).toBe(8000);
    expect(parsed.payload.selectedIndex).toBeUndefined();
  });

  it('should resolve round when both players answer', () => {
    const s1 = createMockSocket();
    const s2 = createMockSocket();

    const room = roomService.createRoom(
      'duel-123',
      { playerId: 'p1', playerName: 'Alice', socket: s1, joinedAt: new Date() },
      { playerId: 'p2', playerName: 'Bob', socket: s2, joinedAt: new Date() },
    );

    roomService.startRound('duel-123', 0);

    const correctIdx = room.questions[0].correctIndex;
    const wrongIdx = (correctIdx + 1) % 4;

    // Both players answer
    roomService.submitAnswer('duel-123', 'p1', 0, correctIdx, 9000);
    roomService.submitAnswer('duel-123', 'p2', 0, wrongIdx, 5000);

    // Both should receive DUEL_ROUND_RESOLVE
    expect(s1.send).toHaveBeenCalledWith(
      expect.stringContaining('DUEL_ROUND_RESOLVE'),
    );
    expect(s2.send).toHaveBeenCalledWith(
      expect.stringContaining('DUEL_ROUND_RESOLVE'),
    );

    // Alice got points (500 + round(9000/10000 * 500) = 500 + 450 = 950)
    expect(room.player1.totalScore).toBe(950);
    // Bob got 0 points
    expect(room.player2.totalScore).toBe(0);
  });

  it('should persist match result and credit XP upon match end', async () => {
    const s1 = createMockSocket();
    const s2 = createMockSocket();

    const p1Uuid = '11111111-1111-4111-8111-111111111111';
    const p2Uuid = '22222222-2222-4222-8222-222222222222';
    const duelId = '33333333-3333-4333-8333-333333333333';

    const room = roomService.createRoom(
      duelId,
      { playerId: p1Uuid, playerName: 'Alice', socket: s1, joinedAt: new Date() },
      { playerId: p2Uuid, playerName: 'Bob', socket: s2, joinedAt: new Date() },
    );

    room.player1.totalScore = 5000;
    room.player2.totalScore = 2000;

    roomService.endMatch(duelId);

    // Clients must receive DUEL_MATCH_END
    expect(s1.send).toHaveBeenCalledWith(expect.stringContaining('DUEL_MATCH_END'));
    expect(s2.send).toHaveBeenCalledWith(expect.stringContaining('DUEL_MATCH_END'));

    // Wait for async persistence tick
    await Promise.resolve();
    await Promise.resolve();

    expect(mockSupabase.client.from).toHaveBeenCalledWith('duel_matches');
    expect(mockSupabase.client.from).toHaveBeenCalledWith('profiles');
  });
});

