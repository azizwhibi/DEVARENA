import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from './skills-database.service';
import { AttemptInput, computeLevel } from './scoring/level.calculator';
import { SCORING_VERSION } from './scoring/scoring.config';

@Injectable()
export class SkillProgressService {
  constructor(private readonly supabase: SupabaseService) {}

  async getUserProgress(userId: string) {
    const { data, error } = await this.supabase.client
      .from('user_skill_progress')
      .select(
        'skill_id, level_score, validated_attempts, status, updated_at, skills(name, slug)',
      )
      .eq('user_id', userId);
    if (error) throw error;
    return data;
  }

  /** Progression avec delta sur 30 jours. */
  async getUserProgressWithDelta(userId: string) {
    const rows = (await this.getUserProgress(userId)) ?? [];
    if (rows.length === 0) return [];

    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const { data: history, error } = await this.supabase.client
      .from('user_skill_history')
      .select('skill_id, level_score, recorded_at')
      .eq('user_id', userId)
      .lt('recorded_at', since)
      .order('recorded_at', { ascending: false });
    if (error) throw error;

    // Dernier point connu avant la fenetre de 30 jours, par competence.
    const baseline = new Map<string, number | null>();
    for (const h of history ?? []) {
      const sid = h.skill_id as string;
      if (!baseline.has(sid)) {
        baseline.set(sid, h.level_score == null ? null : Number(h.level_score));
      }
    }

    return rows.map((r) => {
      const current = r.level_score == null ? null : Number(r.level_score);
      const base = baseline.get(r.skill_id as string);
      const delta30d =
        current == null || base == null
          ? null
          : Math.round((current - base) * 100) / 100;
      return { ...r, level_score: current, delta30d };
    });
  }

  async getUserHistory(userId: string, skillId: string) {
    const { data, error } = await this.supabase.client
      .from('user_skill_history')
      .select('level_score, validated_attempts, recorded_at')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .order('recorded_at', { ascending: true });
    if (error) throw error;
    return data;
  }

  /** Defis lies a une competence, avec l'etat des tentatives de l'utilisateur. */
  async getSkillChallenges(userId: string, skillId: string) {
    const { data: skill } = await this.supabase.client
      .from('skills')
      .select('id')
      .eq('id', skillId)
      .maybeSingle();
    if (!skill) throw new NotFoundException("Skill not found.");

    const { data: links, error: linkErr } = await this.supabase.client
      .from('challenge_skills')
      .select(
        'challenge_id, weight, challenges(id, title, difficulty, is_published)',
      )
      .eq('skill_id', skillId);
    if (linkErr) throw linkErr;

    const ids = (links ?? []).map((l) => l.challenge_id as string);
    const attemptsByChallenge = new Map<
      string,
      { played: boolean; validated: boolean }
    >();

    if (ids.length > 0) {
      const { data: attempts, error: attErr } = await this.supabase.client
        .from('attempts')
        .select('challenge_id, is_validated')
        .eq('user_id', userId)
        .in('challenge_id', ids);
      if (attErr) throw attErr;
      for (const a of attempts ?? []) {
        const cid = a.challenge_id as string;
        const prev = attemptsByChallenge.get(cid) ?? {
          played: false,
          validated: false,
        };
        attemptsByChallenge.set(cid, {
          played: true,
          validated: prev.validated || Boolean(a.is_validated),
        });
      }
    }

    return (links ?? [])
      .map((l) => {
        const c = l.challenges as unknown as {
          id: string;
          title: string;
          difficulty: string;
          is_published: boolean;
        } | null;
        const state = attemptsByChallenge.get(l.challenge_id as string);
        return {
          challengeId: l.challenge_id as string,
          title: c?.title ?? null,
          difficulty: c?.difficulty ?? null,
          linkWeight: Number(l.weight),
          isPublished: c?.is_published ?? false,
          state: state?.validated
            ? 'validated'
            : state?.played
              ? 'played'
              : 'not_played',
        };
      })
      .filter((c) => c.isPublished);
  }

  /** Recalcule une competence a partir de la 1re tentative validee de chaque defi. */
  async recalculate(userId: string, skillId: string) {
    const { data: skill } = await this.supabase.client
      .from('skills')
      .select('id')
      .eq('id', skillId)
      .maybeSingle();
    if (!skill) throw new NotFoundException("Skill not found.");

    const { data: links, error: linkErr } = await this.supabase.client
      .from('challenge_skills')
      .select('challenge_id, weight')
      .eq('skill_id', skillId);
    if (linkErr) throw linkErr;

    const linkWeight = new Map<string, number>(
      (links ?? []).map((l) => [l.challenge_id as string, Number(l.weight)]),
    );

    let inputs: AttemptInput[] = [];
    if (linkWeight.size > 0) {
      const { data: attempts, error: attErr } = await this.supabase.client
        .from('attempts')
        .select('challenge_id, accuracy, created_at')
        .eq('user_id', userId)
        .eq('is_validated', true)
        .in('challenge_id', [...linkWeight.keys()])
        .order('created_at', { ascending: true });
      if (attErr) throw attErr;

      // La meilleure tentative validee par defi est prise en compte pour valoriser la progression.
      const best = new Map<string, number>();
      for (const a of attempts ?? []) {
        const cid = a.challenge_id as string;
        const current = best.get(cid) ?? 0;
        best.set(cid, Math.max(current, Number(a.accuracy)));
      }

      const difficulty = new Map<string, string>();
      if (best.size > 0) {
        const { data: chs, error: chErr } = await this.supabase.client
          .from('challenges')
          .select('id, difficulty')
          .in('id', [...best.keys()]);
        if (chErr) throw chErr;
        for (const c of chs ?? []) {
          difficulty.set(c.id as string, String(c.difficulty));
        }
      }

      inputs = [...best.entries()].map(([cid, accuracy]) => ({
        accuracy,
        difficulty: difficulty.get(cid) ?? 'easy',
        linkWeight: linkWeight.get(cid) ?? 1,
      }));
    }

    const result = computeLevel(inputs);

    const { error: upErr } = await this.supabase.client
      .from('user_skill_progress')
      .upsert(
        {
          user_id: userId,
          skill_id: skillId,
          level_score: result.levelScore ?? 0,
          validated_attempts: result.validatedAttempts,
          status: result.status,
          scoring_version: SCORING_VERSION,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,skill_id' },
      );
    if (upErr) throw upErr;

    // On n'ajoute un point d'historique que si le niveau ou le nombre de tentatives change.
    const { data: last, error: lastErr } = await this.supabase.client
      .from('user_skill_history')
      .select('level_score, validated_attempts')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastErr) throw lastErr;

    const lastScore =
      last?.level_score == null ? null : Number(last.level_score);
    const changed =
      !last ||
      lastScore !== result.levelScore ||
      last.validated_attempts !== result.validatedAttempts;

    if (changed) {
      const { error: histErr } = await this.supabase.client
        .from('user_skill_history')
        .insert({
          user_id: userId,
          skill_id: skillId,
          level_score: result.levelScore ?? 0,
          validated_attempts: result.validatedAttempts,
        });
      if (histErr) throw histErr;
    }
    return { userId, skillId, ...result };
  }

  /**
   * Applique le résultat d'une tentative de défi en direct :
   * - Si correct (succès) : augmente le score (+6%) et enregistre dans l'historique
   * - Si incorrect (échec) : diminue le score (-6%) et enregistre dans l'historique
   */
  async applyAttemptResult(
    userId: string,
    challengeId: string,
    isSuccess: boolean,
    specificSkillId?: string,
  ) {
    // 1. Enregistre la tentative dans la table attempts
    await this.supabase.client.from('attempts').insert({
      user_id: userId,
      challenge_id: challengeId,
      accuracy: isSuccess ? 1.0 : 0.0,
      is_validated: isSuccess,
    });

    // 2. Trouve les compétences à impacter :
    // Si une compétence spécifique est ciblée (par exemple depuis le bouton "Défier" d'une compétence précise),
    // on met à jour UNIQUEMENT cette compétence pour ne pas impacter les autres !
    let skillIds: Set<string>;
    if (specificSkillId) {
      skillIds = new Set<string>([specificSkillId]);
    } else {
      const { data: links } = await this.supabase.client
        .from('challenge_skills')
        .select('skill_id')
        .eq('challenge_id', challengeId);
      skillIds = new Set<string>(
        (links ?? []).map((l: any) => l.skill_id as string),
      );
    }

    const updated: any[] = [];
    for (const sid of skillIds) {
      // Récupère le score actuel
      const { data: currentProg } = await this.supabase.client
        .from('user_skill_progress')
        .select('level_score, validated_attempts')
        .eq('user_id', userId)
        .eq('skill_id', sid)
        .maybeSingle();

      const oldScore =
        currentProg?.level_score != null ? Number(currentProg.level_score) : 75;
      const oldAttempts = Number(currentProg?.validated_attempts ?? 0);

      // Calcul du nouveau score (+6% si succès, -6% si échec)
      const delta = isSuccess ? 6 : -6;
      const newScore = Math.max(
        15,
        Math.min(100, Math.round(oldScore + delta)),
      );
      const newAttempts = isSuccess ? oldAttempts + 1 : oldAttempts;

      const status =
        newScore >= 85
          ? 'expert'
          : newScore >= 65
            ? 'advanced'
            : newScore >= 35
              ? 'intermediate'
              : 'beginner';

      // Met à jour la table de progression
      await this.supabase.client.from('user_skill_progress').upsert(
        {
          user_id: userId,
          skill_id: sid,
          level_score: newScore,
          validated_attempts: newAttempts,
          status,
          scoring_version: SCORING_VERSION,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,skill_id' },
      );

      // Insère systématiquement un point dans user_skill_history pour tracer la hausse ou la baisse
      await this.supabase.client.from('user_skill_history').insert({
        user_id: userId,
        skill_id: sid,
        level_score: newScore,
        validated_attempts: newAttempts,
        recorded_at: new Date().toISOString(),
      });

      updated.push({ skillId: sid, oldScore, newScore, delta, status });
    }

    return { isSuccess, updated };
  }
}
