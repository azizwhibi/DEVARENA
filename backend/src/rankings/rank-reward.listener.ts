import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { SupabaseService } from '../supabase/supabase.service';

export interface RankReward {
  awarded: boolean;
  tier?: string;
  credits_awarded?: number;
  new_balance?: number;
  rewards?: { tier: string; credits_awarded: number }[];
  reason?: string;
}
export interface RankPromotion extends RankReward {
  userId: string;
}

function isSchemaCacheMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  return (
    e.code === 'PGRST205' ||
    e.code === 'PGRST202' ||
    (typeof e.message === 'string' &&
      (e.message.includes('schema cache') ||
        e.message.includes('not find the table') ||
        e.message.includes('not find the function')))
  );
}

@Injectable()
export class RankRewardListener {
  private readonly logger = new Logger(RankRewardListener.name);
  constructor(
    private readonly supabase: SupabaseService,
    private readonly events: EventEmitter2,
  ) {}

  async checkAndGrant(userId: string): Promise<RankReward> {
    try {
      const { data, error } = await this.supabase.client.rpc(
        'check_and_grant_rank_reward',
        { p_user_id: userId },
      );
      if (error && isSchemaCacheMissing(error)) {
        this.logger.warn(
          "RPC 'check_and_grant_rank_reward' not in schema cache; skipping reward check.",
        );
        return { awarded: false, reason: 'schema_not_migrated' };
      }
      if (error || !data) throw new Error();
      const reward = data as unknown as RankReward;
      if (reward.awarded)
        this.events.emit('rank.promoted', { userId, ...reward });
      return reward;
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      throw new ServiceUnavailableException(
        'Rank rewards are temporarily unavailable.',
      );
    }
  }

  @OnEvent('duel.finished')
  async onDuelFinished(event: {
    playerA: string;
    playerB: string;
  }): Promise<void> {
    for (const userId of [event.playerA, event.playerB]) {
      try {
        await this.checkAndGrant(userId);
      } catch {
        this.logger.warn('Rank reward check failed after battle.');
      }
    }
  }
}
