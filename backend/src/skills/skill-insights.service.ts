import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from './skills-database.service';

const DIFFICULTY_ORDER: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export type AttemptState = 'not_started' | 'attempted' | 'validated';

@Injectable()
export class SkillInsightsService {
  private readonly logger = new Logger(SkillInsightsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private get db() {
    return this.supabase.client;
  }

  private fail(error: { message: string }): never {
    this.logger.error(error.message);
    throw new InternalServerErrorException("Something went wrong. Please retry.");
  }

  private async getSkillOrThrow(skillId: string, onlyActive: boolean) {
    const { data, error } = await this.db
      .from('skills')
      .select('id, name, is_active')
      .eq('id', skillId)
      .maybeSingle();
    if (error) this.fail(error);
    if (!data || (onlyActive && !data.is_active)) {
      throw new NotFoundException("Skill not found.");
    }
    return data;
  }

  // Defis lies a une competence, avec l'etat des tentatives du developpeur.
  async challengesForUser(userId: string, skillId: string) {
    const skill = await this.getSkillOrThrow(skillId, false);

    const links = await this.db
      .from('challenge_skills')
      .select('weight, challenge:challenges(*)')
      .eq('skill_id', skillId);
    if (links.error) this.fail(links.error);

    const rows = (links.data ?? [])
      .map((l: any) => ({
        weight: l.weight,
        challenge: Array.isArray(l.challenge) ? l.challenge[0] : l.challenge,
      }))
      .filter((r) => r.challenge && r.challenge.is_published !== false);

    const attemptsByChallenge = new Map<string, any[]>();
    const ids = rows.map((r) => r.challenge.id as string);
    if (ids.length > 0) {
      const attempts = await this.db
        .from('attempts')
        .select('challenge_id, accuracy, is_validated, created_at')
        .eq('user_id', userId)
        .in('challenge_id', ids)
        .order('created_at', { ascending: true });
      if (attempts.error) this.fail(attempts.error);

      for (const a of attempts.data ?? []) {
        const list = attemptsByChallenge.get(a.challenge_id) ?? [];
        list.push(a);
        attemptsByChallenge.set(a.challenge_id, list);
      }
    }

    const challenges = rows
      .map((r) => {
        const list = attemptsByChallenge.get(r.challenge.id) ?? [];
        // Comme pour le niveau : seule la premiere tentative validee compte.
        const firstValidated = list.find((a) => a.is_validated);
        const state: AttemptState = firstValidated
          ? 'validated'
          : list.length > 0
            ? 'attempted'
            : 'not_started';
        return {
          id: r.challenge.id as string,
          title: r.challenge.title as string,
          difficulty: r.challenge.difficulty as string,
          category: (r.challenge.category as string | undefined) ?? null,
          weight: r.weight as number,
          state,
          attemptsCount: list.length,
          accuracy: firstValidated ? Number(firstValidated.accuracy) : null,
        };
      })
      .sort(
        (a, b) =>
          (DIFFICULTY_ORDER[a.difficulty] ?? 9) -
            (DIFFICULTY_ORDER[b.difficulty] ?? 9) ||
          a.title.localeCompare(b.title),
      );

    return {
      skillId,
      skillName: skill.name as string,
      total: challenges.length,
      validated: challenges.filter((c) => c.state === 'validated').length,
      challenges,
    };
  }

  // Statistiques d'une competence pour la page admin.
  async stats(skillId: string) {
    const skill = await this.getSkillOrThrow(skillId, false);

    const [links, progress] = await Promise.all([
      this.db
        .from('challenge_skills')
        .select('challenge_id', { count: 'exact', head: true })
        .eq('skill_id', skillId),
      this.db
        .from('user_skill_progress')
        .select('level_score, status')
        .eq('skill_id', skillId),
    ]);
    if (links.error) this.fail(links.error);
    if (progress.error) this.fail(progress.error);

    const byStatus: Record<string, number> = {
      not_evaluated: 0,
      beginner: 0,
      intermediate: 0,
      advanced: 0,
      expert: 0,
    };
    const levels: number[] = [];
    for (const p of progress.data ?? []) {
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
      if (p.status !== 'not_evaluated' && p.level_score !== null) {
        levels.push(Number(p.level_score));
      }
    }

    return {
      skillId,
      name: skill.name as string,
      isActive: skill.is_active as boolean,
      challengeCount: links.count ?? 0,
      usersTracked: (progress.data ?? []).length,
      evaluatedUsers: levels.length,
      averageLevel:
        levels.length > 0
          ? Math.round(
              (levels.reduce((sum, l) => sum + l, 0) / levels.length) * 100,
            ) / 100
          : null,
      byStatus,
    };
  }
}
