import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RankingsQueryDto } from './dto/rankings-query.dto';

export interface RankingItem {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  institution: string | null;
  devScore: number | null;
  tier: string | null;
}

export interface MyRank {
  rank: number | null;
  devScore: number | null;
  tier: string | null;
  eligible: boolean;
}

export interface RankingsResponse {
  items: RankingItem[];
  total: number;
  page: number;
  pageSize: number;
  me: MyRank | null;
}

@Injectable()
export class RankingsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getRankings(
    query: RankingsQueryDto,
    user?: { id: string },
  ): Promise<RankingsResponse> {
    const scope = query.scope ?? 'global';
    let value = query.value ?? null;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Default scope values for logged-in caller if omitted
    if (user?.id && !value && (scope === 'country' || scope === 'institution')) {
      const { data: prof } = await this.supabase.client
        .from('profiles')
        .select('country, institution')
        .eq('id', user.id)
        .maybeSingle();

      if (scope === 'country' && prof?.country) {
        value = prof.country;
      } else if (scope === 'institution' && prof?.institution) {
        value = prof.institution;
      }
    }

    // Call leaderboard RPC
    const { data: rows, error: rpcErr } = await this.supabase.client.rpc(
      'leaderboard',
      {
        p_scope: scope,
        p_value: value,
        p_limit: pageSize,
        p_offset: offset,
      },
    );

    let items: RankingItem[] = [];
    let total = 0;

    if (!rpcErr && rows) {
      items = rows.map((r: any) => ({
        rank: Number(r.rank),
        userId: r.user_id,
        username: r.username,
        avatarUrl: r.avatar_url ?? null,
        country: r.country ?? null,
        institution: r.institution ?? null,
        devScore: r.dev_score != null ? Number(r.dev_score) : null,
        tier: r.tier ?? null,
      }));
      total = rows[0]?.total != null ? Number(rows[0].total) : items.length;
    }

    // If caller is authenticated, compute their rank in this scope
    let me: MyRank | null = null;
    if (user?.id) {
      const { data: rankRows } = await this.supabase.client.rpc('my_rank', {
        p_user_id: user.id,
        p_scope: scope,
        p_value: value,
      });

      if (rankRows && rankRows[0]) {
        const r = rankRows[0];
        me = {
          rank: r.rank != null ? Number(r.rank) : null,
          devScore: r.dev_score != null ? Number(r.dev_score) : null,
          tier: r.tier ?? null,
          eligible: Boolean(r.eligible),
        };
      } else {
        me = { rank: null, devScore: null, tier: null, eligible: false };
      }
    }

    return {
      items,
      total,
      page,
      pageSize,
      me,
    };
  }
}
