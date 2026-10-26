import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../supabase/supabase.service';
import { RankRewardListener } from './rank-reward.listener';

describe('RankRewardListener', () => {
  const rpc = jest.fn();
  const emit = jest.fn();
  let listener: RankRewardListener;
  beforeEach(() => {
    rpc.mockReset();
    emit.mockReset();
    listener = new RankRewardListener(
      { client: { rpc } } as unknown as SupabaseService,
      { emit } as unknown as EventEmitter2,
    );
  });
  const reward = {
    awarded: true,
    tier: 'Gold',
    credits_awarded: 850,
    new_balance: 850,
    rewards: [
      { tier: 'Bronze', credits_awarded: 100 },
      { tier: 'Silver', credits_awarded: 250 },
      { tier: 'Gold', credits_awarded: 500 },
    ],
  };
  it('emits a private promotion only when the database grants a milestone', async () => {
    rpc
      .mockResolvedValueOnce({ data: reward, error: null })
      .mockResolvedValueOnce({ data: { awarded: false }, error: null });
    expect(await listener.checkAndGrant('alice')).toEqual(reward);
    await listener.checkAndGrant('alice');
    expect(rpc).toHaveBeenCalledWith('check_and_grant_rank_reward', {
      p_user_id: 'alice',
    });
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('rank.promoted', {
      userId: 'alice',
      ...reward,
    });
  });
  it('checks both participants after the authoritative rating update', async () => {
    rpc.mockResolvedValue({ data: { awarded: false }, error: null });
    await listener.onDuelFinished({ playerA: 'alice', playerB: 'bob' });
    expect(rpc.mock.calls.map((call) => call[1].p_user_id)).toEqual([
      'alice',
      'bob',
    ]);
  });
  it.each([
    { data: null, error: { message: 'SECRET' } },
    { data: null, error: null },
  ])('does not report grants when persistence fails', async (result) => {
    rpc.mockResolvedValue(result);
    await expect(listener.checkAndGrant('alice')).rejects.toThrow(
      'Rank rewards are temporarily unavailable.',
    );
    expect(emit).not.toHaveBeenCalled();
  });
  it('continues checking the second player when the first reward check fails', async () => {
    rpc
      .mockRejectedValueOnce(new Error('SECRET'))
      .mockResolvedValueOnce({ data: reward, error: null });
    await listener.onDuelFinished({ playerA: 'alice', playerB: 'bob' });
    expect(emit).toHaveBeenCalledWith('rank.promoted', {
      userId: 'bob',
      ...reward,
    });
  });
});
