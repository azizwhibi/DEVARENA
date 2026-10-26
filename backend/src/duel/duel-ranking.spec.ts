import { EventEmitter2 } from '@nestjs/event-emitter';
import type { WebSocket } from 'ws';
import { DuelRoomService } from './duel-room.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('competitive duel persistence', () => {
  const insert = jest.fn();
  const rpc = jest.fn();
  const emit = jest.fn();
  const maybeSingle = jest.fn();
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
    maybeSingle.mockReset();
    insert.mockResolvedValue({ error: null });
    rpc.mockResolvedValue({ data: result, error: null });
    service = new DuelRoomService(
      {
        client: { from: jest.fn().mockReturnValue({ insert, select: () => ({ eq: () => ({ maybeSingle }) }) }), rpc },
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

  it('reports pending followed by a sanitized failure to both players when saving fails', async () => {
    insert.mockResolvedValue({ error: { code: 'PGRST205', message: 'SECRET' } });
    const match = room();
    service.endMatch('match');
    await flush();
    for (const player of [match.player1, match.player2]) {
      expect(player.socket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'DUEL_RATING_STATUS', payload: { duelId: 'match', status: 'pending' },
      }));
      expect(player.socket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'DUEL_RATING_STATUS', payload: { duelId: 'match', status: 'failed', code: 'match_save_failed' },
      }));
      expect(player.socket.send).not.toHaveBeenCalledWith(expect.stringContaining('SECRET'));
    }
  });

  it('reports a failed rating application without announcing a saved update', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'SECRET' } });
    const match = room();
    service.endMatch('match');
    await flush();
    expect(match.player1.socket.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'DUEL_RATING_STATUS', payload: { duelId: 'match', status: 'failed', code: 'rating_apply_failed' },
    }));
    expect(emit).not.toHaveBeenCalled();
  });

  it('recovers a matching stored match without inserting another or granting duplicate rewards', async () => {
    const match = room();
    insert.mockResolvedValue({ error: { code: '23505' } });
    maybeSingle.mockResolvedValue({ data: {
      player1_id: 'alice', player2_id: 'bob', player1_score: 0, player2_score: 0,
      winner_id: null, is_forfeit: false, rounds_data: [],
    }, error: null });
    rpc.mockResolvedValue({ data: { ...result, applied: false }, error: null });
    service.endMatch('match');
    await flush();
    expect(rpc).toHaveBeenCalledWith('apply_competitive_duel', { p_match_id: 'match' });
    expect(match.player1.socket.send).toHaveBeenCalledWith(expect.stringContaining('DUEL_RATING_UPDATED'));
    expect(emit).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('rejects a duplicate match ID whose stored evidence differs', async () => {
    room();
    insert.mockResolvedValue({ error: { code: '23505' } });
    maybeSingle.mockResolvedValue({ data: { player1_id: 'different' }, error: null });
    service.endMatch('match');
    await flush();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('compares stored JSONB round evidence independently of object key order', async () => {
    const match = room();
    match.player1.roundScores = [10];
    match.player2.roundScores = [0];
    insert.mockResolvedValue({ error: { code: '23505' } });
    maybeSingle.mockResolvedValue({ data: {
      player1_id: 'alice', player2_id: 'bob', player1_score: 0, player2_score: 0,
      winner_id: null, is_forfeit: false,
      rounds_data: [{ player2Score: 0, questionId: match.questions[0].id, player1Score: 10, roundIndex: 0 }],
    }, error: null });
    service.endMatch('match');
    await flush();
    expect(rpc).toHaveBeenCalled();
  });

  it.each([
    { applied: 'false' }, { rating_a: -1 }, { points_a: -1 }, { delta_a: 1.5 },
    { rating_b: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects malformed authoritative rating payloads %o', async (changes) => {
    rpc.mockResolvedValue({ data: { ...result, ...changes }, error: null });
    const match = room();
    service.endMatch('match');
    await flush();
    expect(match.player1.socket.send).not.toHaveBeenCalledWith(expect.stringContaining('DUEL_RATING_UPDATED'));
    expect(emit).not.toHaveBeenCalled();
  });

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
          marginBonus: 0,
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
          marginBonus: 0,
        },
      }),
    );
    expect(emit).toHaveBeenCalledWith('duel.finished', {
      playerA: 'alice',
      playerB: 'bob',
      winnerId: 'alice',
      deltaA: 24,
      deltaB: -20,
      marginBonusA: 0,
      marginBonusB: 0,
    });
    service.endMatch('match');
    await flush();
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('includes blowout margin bonus (+50%) when winner score difference >= 5000', async () => {
    rpc.mockResolvedValue({
      data: {
        ...result,
        delta_a: 36,
        rating_a: 1236,
        points_a: 742,
        margin_bonus_a: 50,
        margin_bonus_b: 0,
      },
      error: null,
    });
    const match = room();
    match.player1.totalScore = 6000;
    match.player2.totalScore = 800;
    service.endMatch('match');
    await flush();
    expect(match.player1.socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'DUEL_RATING_UPDATED',
        payload: {
          duelId: 'match',
          delta: 36,
          rating: 1236,
          competitivePoints: 742,
          marginBonus: 50,
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
          marginBonus: 0,
        },
      }),
    );
  });

  it('includes dominant margin bonus (+25%) when winner score difference >= 2500', async () => {
    rpc.mockResolvedValue({
      data: {
        ...result,
        delta_a: 30,
        rating_a: 1230,
        points_a: 738,
        margin_bonus_a: 25,
        margin_bonus_b: 0,
      },
      error: null,
    });
    const match = room();
    match.player1.totalScore = 3500;
    match.player2.totalScore = 800;
    service.endMatch('match');
    await flush();
    expect(match.player1.socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'DUEL_RATING_UPDATED',
        payload: {
          duelId: 'match',
          delta: 30,
          rating: 1230,
          competitivePoints: 738,
          marginBonus: 25,
        },
      }),
    );
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
    { data: { applied: false, reason: 'invalid_match' }, error: null },
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
