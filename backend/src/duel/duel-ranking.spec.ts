import { EventEmitter2 } from '@nestjs/event-emitter';
import type { WebSocket } from 'ws';
import { DuelRoomService } from './duel-room.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('competitive duel persistence', () => {
  const insert = jest.fn();
  const rpc = jest.fn();
  const emit = jest.fn();
  let service: DuelRoomService;
  const result = {
    applied: true,
    player_a: 'alice',
    player_b: 'bob',
    delta_a: 24,
    delta_b: -20,
    rating_a: 1224,
    rating_b: 1180,
    points_a: 734,
    points_b: 708,
  };
  const socket = () =>
    ({ readyState: 1, send: jest.fn() }) as unknown as WebSocket;
  beforeEach(() => {
    jest.useFakeTimers();
    insert.mockReset();
    rpc.mockReset();
    emit.mockReset();
    insert.mockResolvedValue({ error: null });
    rpc.mockResolvedValue({ data: result, error: null });
    service = new DuelRoomService(
      {
        client: { from: jest.fn().mockReturnValue({ insert }), rpc },
      } as unknown as SupabaseService,
      { emit } as unknown as EventEmitter2,
    );
  });
  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });
  function room() {
    return service.createRoom(
      'match',
      {
        playerId: 'alice',
        playerName: 'Alice',
        socket: socket(),
        joinedAt: new Date(),
      },
      {
        playerId: 'bob',
        playerName: 'Bob',
        socket: socket(),
        joinedAt: new Date(),
      },
    );
  }
  const flush = async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  };

  it('persists server results before applying ratings and sends personalized authoritative changes', async () => {
    const match = room();
    match.player1.totalScore = 100;
    service.endMatch('match');
    await flush();
    expect(rpc).toHaveBeenCalledWith('apply_competitive_duel', {
      p_match_id: 'match',
    });
    expect(insert.mock.invocationCallOrder[0]).toBeLessThan(
      rpc.mock.invocationCallOrder[0],
    );
    expect(match.player1.socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'DUEL_RATING_UPDATED',
        payload: {
          duelId: 'match',
          delta: 24,
          rating: 1224,
          competitivePoints: 734,
        },
      }),
    );
    expect(match.player2.socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'DUEL_RATING_UPDATED',
        payload: {
          duelId: 'match',
          delta: -20,
          rating: 1180,
          competitivePoints: 708,
        },
      }),
    );
    expect(emit).toHaveBeenCalledWith('duel.finished', {
      playerA: 'alice',
      playerB: 'bob',
      winnerId: 'alice',
      deltaA: 24,
      deltaB: -20,
    });
    service.endMatch('match');
    await flush();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('persists forfeits so they cannot earn the sweep bonus', async () => {
    room();
    service.endMatch('match', 'bob');
    await flush();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_forfeit: true, winner_id: 'bob' }),
    );
  });
  it('does not rate a result when match persistence fails', async () => {
    insert.mockResolvedValue({ error: { message: 'SECRET' } });
    room();
    service.endMatch('match');
    await flush();
    expect(rpc).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
  it.each([
    { data: null, error: { message: 'SECRET' } },
    { data: { ...result, applied: false }, error: null },
  ])(
    'does not announce ratings or promotions on failed/replayed updates',
    async (response) => {
      rpc.mockResolvedValue(response);
      const match = room();
      service.endMatch('match');
      await flush();
      expect(emit).not.toHaveBeenCalled();
      expect(match.player1.socket.send).not.toHaveBeenCalledWith(
        expect.stringContaining('DUEL_RATING_UPDATED'),
      );
    },
  );
});
