import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  escapeSearchTerm,
  GetRankingsQueryDto,
} from './dto/get-rankings-query.dto';
import type {
  GetRankingsResponse,
  RankingItem,
  UserRankMetrics,
} from './rankings.types';

@Injectable()
export class RankingsService {
  private readonly logger = new Logger(RankingsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Récupère la liste paginée du classement avec filtrage optionnel par pays, établissement ou recherche.
   * Si un ID utilisateur connecté est fourni, renvoie également sa position et ses métriques complètes.
   */
  async getRankings(
    query: GetRankingsQueryDto,
    currentUserId?: string,
  ): Promise<GetRankingsResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const offset = (page - 1) * limit;
    const scope = query.scope ?? 'global';

    let dbQuery = this.supabase.client
      .from('v_dev_rankings')
      .select('*', { count: 'exact' })
      .eq('visibility', 'public');

    // Filtre de recherche textuelle sur le pseudo
    if (query.search) {
      const cleaned = escapeSearchTerm(query.search.trim());
      if (cleaned.length > 0) {
        dbQuery = dbQuery.ilike('username', `%${cleaned}%`);
      }
    }

    // Filtrage par portée (scope)
    if (scope === 'country' && query.value) {
      dbQuery = dbQuery.eq('country', query.value.trim().toUpperCase());
    } else if (scope === 'school' && query.value) {
      const schoolTerm = escapeSearchTerm(query.value.trim());
      dbQuery = dbQuery.ilike('institution', `%${schoolTerm}%`);
    }

    // Tri strict par rang ascendant et pagination
    dbQuery = dbQuery
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await dbQuery;

    if (error) {
      this.logger.error('Failed to query rankings from v_dev_rankings', error);
      throw new InternalServerErrorException('Failed to retrieve rankings');
    }

    const items: RankingItem[] = (data ?? []).map((row) => ({
      rank: row.rank,
      userId: row.user_id,
      username: row.username,
      avatarUrl: row.avatar_url,
      country: row.country,
      institution: row.institution,
      devScore: row.dev_score,
      tier: row.tier,
      xp: row.xp,
      matchesWon: row.matches_won,
      totalMatches: row.total_matches,
      avgAccuracy: Number(row.avg_accuracy),
    }));

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    // Récupération de la position et des métriques du joueur connecté
    let currentUserRank: UserRankMetrics | null = null;
    if (currentUserId) {
      try {
        currentUserRank = await this.getUserRankMetrics(currentUserId);
      } catch (err) {
        if (!(err instanceof NotFoundException)) {
          this.logger.warn(
            `Unable to retrieve current user rank for ${currentUserId}: ${(err as Error).message}`,
          );
        }
      }
    }

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      currentUserRank,
    };
  }

  /**
   * Récupère les métriques détaillées de rang du joueur (rank, devScore, tier, winRate, etc.).
   */
  async getUserRankMetrics(userId: string): Promise<UserRankMetrics> {
    const { data: row, error } = await this.supabase.client
      .from('v_dev_rankings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Error querying user ranking metrics for ${userId}`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve user ranking metrics',
      );
    }

    if (!row) {
      throw new NotFoundException('Ranking metrics not found for user');
    }

    const totalMatches = row.total_matches || 0;
    const matchesWon = row.matches_won || 0;
    const winRate =
      totalMatches > 0 ? Math.round((matchesWon / totalMatches) * 100) : 0;

    return {
      rank: row.rank,
      userId: row.user_id,
      username: row.username,
      avatarUrl: row.avatar_url,
      country: row.country,
      institution: row.institution,
      devScore: row.dev_score,
      tier: row.tier,
      xp: row.xp,
      matchesWon,
      totalMatches,
      avgAccuracy: Number(row.avg_accuracy),
      status: row.status,
      visibility: row.visibility,
      winRate,
      validatedAttempts: row.validated_attempts,
    };
  }
}
