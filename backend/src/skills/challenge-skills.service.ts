import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from './skills-database.service';
import { SkillProgressService } from './skill-progress.service';
import { SetChallengeSkillsDto } from './dto/challenge-skills.dto';

interface Link {
  skill_id: string;
  weight: number;
}

@Injectable()
export class ChallengeSkillsService {
  private readonly logger = new Logger(ChallengeSkillsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly progress: SkillProgressService,
  ) {}

  private get db() {
    return this.supabase.client;
  }

  private fail(error: { message: string }): never {
    this.logger.error(error.message);
    throw new InternalServerErrorException('Une erreur est survenue.');
  }

  private async ensureChallenge(challengeId: string) {
    const { data, error } = await this.db
      .from('challenges')
      .select('id')
      .eq('id', challengeId)
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('Defi introuvable.');
  }

  private async currentLinks(challengeId: string): Promise<Link[]> {
    const { data, error } = await this.db
      .from('challenge_skills')
      .select('skill_id, weight')
      .eq('challenge_id', challengeId);
    if (error) this.fail(error);
    return data ?? [];
  }

  // Competences actuellement liees a un defi, avec leur poids.
  async get(challengeId: string) {
    await this.ensureChallenge(challengeId);

    const { data, error } = await this.db
      .from('challenge_skills')
      .select('weight, skill:skills(id,name,slug,is_active)')
      .eq('challenge_id', challengeId);
    if (error) this.fail(error);

    return {
      challengeId,
      skills: (data ?? []).map((row: any) => {
        const skill = Array.isArray(row.skill) ? row.skill[0] : row.skill;
        return { ...skill, weight: row.weight };
      }),
    };
  }

  // Remplace la liste complete des competences d'un defi.
  async replace(
    challengeId: string,
    dto: SetChallengeSkillsDto,
    actorId: string | null,
  ) {
    await this.ensureChallenge(challengeId);

    const wanted = dto.skills.map((s) => ({
      skill_id: s.skillId,
      weight: s.weight ?? 1,
    }));
    const ids = wanted.map((w) => w.skill_id);

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Une competence apparait plusieurs fois.');
    }

    if (ids.length > 0) {
      const { data, error } = await this.db
        .from('skills')
        .select('id, is_active')
        .in('id', ids);
      if (error) this.fail(error);

      const found = new Map<string, boolean>(
        (data ?? []).map((s: any) => [s.id as string, s.is_active as boolean]),
      );
      if (found.size !== ids.length) {
        throw new BadRequestException('Une competence est introuvable.');
      }
      if ([...found.values()].some((active) => !active)) {
        throw new BadRequestException('Une competence est desactivee.');
      }
    }

    const before = await this.currentLinks(challengeId);
    const beforeWeights = new Map(before.map((l) => [l.skill_id, l.weight]));

    // 1) ajout / mise a jour d'abord, 2) suppression ensuite : le defi n'est jamais sans lien.
    if (wanted.length > 0) {
      const { error } = await this.db.from('challenge_skills').upsert(
        wanted.map((w) => ({ challenge_id: challengeId, ...w })),
        { onConflict: 'challenge_id,skill_id' },
      );
      if (error) this.fail(error);
    }

    const removed = before
      .map((l) => l.skill_id)
      .filter((id) => !ids.includes(id));
    if (removed.length > 0) {
      const { error } = await this.db
        .from('challenge_skills')
        .delete()
        .eq('challenge_id', challengeId)
        .in('skill_id', removed);
      if (error) this.fail(error);
    }

    const { error: auditError } = await this.db.from('audit_log').insert({
      target_id: challengeId,
      action: 'challenge_skills.replace',
      actor_id: actorId,
      before,
      after: wanted,
    });
    if (auditError) this.logger.error(`audit_log: ${auditError.message}`);

    // Competences dont le calcul change : ajoutees, retirees ou dont le poids a change.
    const affected = [
      ...removed,
      ...wanted
        .filter((w) => beforeWeights.get(w.skill_id) !== w.weight)
        .map((w) => w.skill_id),
    ];
    void this.recalculateAffected(challengeId, affected);

    return this.get(challengeId);
  }

  // En arriere-plan : recalcule le niveau des developpeurs deja evalues sur ce defi.
  private async recalculateAffected(challengeId: string, skillIds: string[]) {
    if (skillIds.length === 0) return;
    try {
      const { data, error } = await this.db
        .from('attempts')
        .select('user_id')
        .eq('challenge_id', challengeId)
        .eq('is_validated', true);
      if (error) throw new Error(error.message);

      const users = [
        ...new Set((data ?? []).map((a: any) => a.user_id as string)),
      ];
      for (const userId of users) {
        for (const skillId of skillIds) {
          await this.progress.recalculate(userId, skillId);
        }
      }
    } catch (e) {
      this.logger.error(`recalcul apres changement de liens : ${String(e)}`);
    }
  }
}
