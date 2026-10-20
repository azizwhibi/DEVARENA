import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../skills-database.service';
import type { AiProvider } from './ai-provider.interface';
import { AI_PROVIDER_TOKEN } from './ai-provider.interface';
import { COACH_SYSTEM_PROMPT } from './coach.prompt';
import { DIFFICULTY_WEIGHT } from '../scoring/scoring.config';

// ── Schéma de réponse attendu de l'IA ────────────────────────────────────────

interface CoachJsonResponse {
  observation: string;
  competent_in?: string;
  skill_id?: string | null;
  skill_name?: string | null;
  challenge_id?: string | null;
  reason?: string;
}

function isCoachJson(v: unknown): v is CoachJsonResponse {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.observation === 'string' &&
    o.observation.length <= 400 &&
    (o.reason === undefined || typeof o.reason === 'string') &&
    (o.challenge_id === null || typeof o.challenge_id === 'string')
  );
}

// ── Types internes ────────────────────────────────────────────────────────────

interface SkillRow {
  skill_id: string;
  name: string;
  status: string;
  level_score: number | null;
  trend: number | null; // delta vs point précédent dans l'historique
}

interface CandidateChallenge {
  id: string;
  title: string;
  difficulty: string;
}

export interface RecommendationResult {
  observation: string;
  competent_in?: string;
  skill_id: string | null;
  skill_name?: string | null;
  challenge_id: string | null;
  reason?: string;
  source: 'ai' | 'fallback';
}

// ── Service ───────────────────────────────────────────────────────────────────

const AI_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 5 * 60 * 1_000; // 5 minutes

@Injectable()
export class AiCoachService {
  private readonly logger = new Logger(AiCoachService.name);

  /**
   * Cache en mémoire par userId.
   * Invalidé dès qu'une tentative validée est enregistrée ou sur demande (via forceRefresh).
   */
  private readonly cache = new Map<
    string,
    { result: RecommendationResult; expiresAt: number }
  >();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
    @Inject(AI_PROVIDER_TOKEN)
    private readonly ai: AiProvider,
  ) {}

  // ── API publique ────────────────────────────────────────────────────────────

  /** Analyse en direct les compétences de l'utilisateur avec l'IA. */
  async recommend(
    userId: string,
    forceRefresh = false,
  ): Promise<RecommendationResult> {
    // 1. Cache (ignoré si forceRefresh demandé)
    if (!forceRefresh) {
      const cached = this.cache.get(userId);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.result;
      }
    } else {
      this.clearCache(userId);
    }

    // 2. Chargement des compétences réelles de l'utilisateur
    const skills = await this.loadSkills(userId);
    if (!skills || skills.length === 0) {
      return this.saveAndCache(userId, this.fallbackNoSkills());
    }

    // Chargement optionnel des défis pour suggérer un ID si disponible
    const candidates = await this.loadCandidates(userId);

    // 3. Appel IA centré sur les compétences de l'utilisateur
    const aiResult = await this.tryAi(skills, candidates);
    if (aiResult) {
      return this.saveAndCache(userId, { ...aiResult, source: 'ai' });
    }

    // 4. Fallback déterministe basé sur les compétences
    return this.saveAndCache(
      userId,
      this.fallbackDeterministic(skills, candidates),
    );
  }

  /** Vide le cache d'un utilisateur (appeler après tentative validée ou refresh). */
  clearCache(userId: string): void {
    this.cache.delete(userId);
  }

  // ── Chargement des compétences ──────────────────────────────────────────────

  private async loadSkills(userId: string): Promise<SkillRow[]> {
    const { data, error } = await this.supabase.client
      .from('user_skill_progress')
      .select('skill_id, status, level_score, skills(name)')
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`loadSkills: ${error.message}`);
      throw new InternalServerErrorException('Erreur chargement compétences.');
    }

    // Calcul de la tendance depuis le dernier point d'historique
    const skillIds = (data ?? []).map((r: any) => r.skill_id as string);
    const trendMap = await this.loadTrends(userId, skillIds);

    return (data ?? []).map((r: any) => ({
      skill_id: r.skill_id as string,
      name: (r.skills as { name: string } | null)?.name ?? r.skill_id,
      status: r.status as string,
      level_score: r.level_score == null ? null : Number(r.level_score),
      trend: trendMap.get(r.skill_id as string) ?? null,
    }));
  }

  private async loadTrends(
    userId: string,
    skillIds: string[],
  ): Promise<Map<string, number | null>> {
    if (skillIds.length === 0) return new Map();

    const { data } = await this.supabase.client
      .from('user_skill_history')
      .select('skill_id, level_score')
      .eq('user_id', userId)
      .in('skill_id', skillIds)
      .order('recorded_at', { ascending: false });

    const result = new Map<string, number | null>();
    const seen = new Map<string, number[]>();

    for (const row of data ?? []) {
      const sid = row.skill_id as string;
      const pts = seen.get(sid) ?? [];
      pts.push(row.level_score == null ? 0 : Number(row.level_score));
      seen.set(sid, pts);
    }

    for (const [sid, pts] of seen) {
      result.set(sid, pts.length >= 2 ? pts[0] - pts[1] : null);
    }
    return result;
  }

  private async loadCandidates(userId: string): Promise<CandidateChallenge[]> {
    try {
      const { data: attempted } = await this.supabase.client
        .from('attempts')
        .select('challenge_id')
        .eq('user_id', userId)
        .eq('is_validated', true);

      const validatedIds = (attempted ?? []).map(
        (a: any) => a.challenge_id as string,
      );

      const { data: links, error } = await this.supabase.client
        .from('challenge_skills')
        .select('challenge_id, challenges(id, title, difficulty, is_published)')
        .limit(30);

      if (error || !links) return [];

      const seen = new Set<string>();
      const candidates: CandidateChallenge[] = [];

      for (const link of links) {
        const c = (link as any).challenges as {
          id: string;
          title: string;
          difficulty: string;
          is_published: boolean;
        } | null;
        if (!c || !c.is_published) continue;
        if (validatedIds.includes(c.id)) continue;
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        candidates.push({ id: c.id, title: c.title, difficulty: c.difficulty });
      }

      return candidates.slice(0, 15);
    } catch {
      return [];
    }
  }

  // ── Appel IA ────────────────────────────────────────────────────────────────

  private async tryAi(
    skills: SkillRow[],
    candidates: CandidateChallenge[],
  ): Promise<Omit<RecommendationResult, 'source'> | null> {
    const userBlock =
      this.buildUserBlock(skills) +
      '\nCandidate challenges:\n' +
      JSON.stringify(candidates);
    const skillMap = new Map(skills.map((s) => [s.skill_id, s]));

    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await this.ai.generateJson(
        COACH_SYSTEM_PROMPT,
        userBlock,
        AI_TIMEOUT_MS,
      );

      if (!isCoachJson(raw)) {
        this.logger.warn(`AI attempt ${attempt + 1}: invalid JSON shape`);
        continue;
      }
      if (
        raw.challenge_id &&
        !candidates.some((candidate) => candidate.id === raw.challenge_id)
      )
        continue;

      // Résolution de la compétence cible
      let validSkillId: string | null =
        raw.skill_id && skillMap.has(raw.skill_id) ? raw.skill_id : null;
      let skillName =
        raw.skill_name ||
        (validSkillId ? skillMap.get(validSkillId)?.name : null);

      if (!validSkillId) {
        const weakest = this.findWeakestSkill(skills);
        validSkillId = weakest?.skill_id ?? null;
        skillName = skillName || weakest?.name || null;
      }

      // Défi optionnel
      let challengeId: string | null = null;
      if (
        raw.challenge_id &&
        candidates.some((c) => c.id === raw.challenge_id)
      ) {
        challengeId = raw.challenge_id;
      } else if (candidates.length > 0) {
        challengeId = candidates[0].id;
      }

      return {
        observation: raw.observation,
        competent_in: raw.competent_in,
        skill_id: validSkillId,
        skill_name: skillName,
        challenge_id: challengeId,
        reason: raw.reason,
      };
    }

    return null;
  }

  // ── Construction du bloc d'analyse des compétences ──────────────────────────

  private buildUserBlock(skills: SkillRow[]): string {
    const strongSkills = skills.filter((s) => (s.level_score ?? 0) >= 80);
    const inProgressSkills = skills.filter(
      (s) => s.level_score !== null && (s.level_score ?? 0) < 80,
    );
    const unevaluatedSkills = skills.filter((s) => s.level_score === null);

    const formatSkill = (s: SkillRow) => {
      const score = s.level_score == null ? 'Non évalué' : `${s.level_score}%`;
      const trend =
        s.trend == null
          ? ''
          : s.trend > 0
            ? ` (+${s.trend}%)`
            : ` (${s.trend}%)`;
      return `- id=${s.skill_id} | "${s.name}" : statut=${s.status}, score=${score}${trend}`;
    };

    return [
      '<CONTEXT>',
      '## Compétences Maîtrisées (Points forts du développeur, score >= 80%)',
      strongSkills.length > 0
        ? strongSkills.map(formatSkill).join('\n')
        : '(aucune au dessus de 80%)',
      '',
      '## Compétences en cours de progression (score < 80%)',
      inProgressSkills.length > 0
        ? inProgressSkills.map(formatSkill).join('\n')
        : '(aucune)',
      '',
      '## Compétences non encore évaluées',
      unevaluatedSkills.length > 0
        ? unevaluatedSkills.map(formatSkill).join('\n')
        : '(aucune)',
      '</CONTEXT>',
    ].join('\n');
  }

  // ── Fallbacks déterministes ─────────────────────────────────────────────────

  private fallbackNoSkills(): RecommendationResult {
    return {
      observation:
        'Aucune compétence enregistrée pour le moment. Lancez vos premiers défis pour initialiser votre diagnostic technique !',
      competent_in: 'En attente des premiers défis',
      skill_id: null,
      skill_name: null,
      challenge_id: null,
      source: 'fallback',
    };
  }

  private fallbackDeterministic(
    skills: SkillRow[],
    candidates: CandidateChallenge[] = [],
  ): RecommendationResult {
    const strong = skills
      .filter((s) => (s.level_score ?? 0) >= 80)
      .sort((a, b) => (b.level_score ?? 0) - (a.level_score ?? 0));
    const weakest = this.findWeakestSkill(skills);

    const strongNames = strong
      .slice(0, 3)
      .map((s) => `${s.name} (${s.level_score}%)`)
      .join(', ');
    const competentIn =
      strongNames || 'Développement full-stack en cours de consolidation';

    return {
      observation:
        strong.length > 0
          ? `Profil technique solide avec une excellente maîtrise démontrée sur ${strong
              .map((s) => s.name)
              .slice(0, 2)
              .join(
                ' et ',
              )}. Accentuez vos efforts sur vos compétences en développement pour parfaire votre polyvalence.`
          : 'Profil technique en phase d’évaluation. Poursuivez vos défis pour consolider vos scores.',
      competent_in: competentIn,
      skill_id: weakest?.skill_id ?? null,
      skill_name: weakest?.name ?? null,
      reason: weakest
        ? `Travailler la compétence "${weakest.name}" permettra d'équilibrer votre profil technique global.`
        : 'Relevez de nouveaux défis pour enrichir votre matrice de compétences.',
      challenge_id:
        [...candidates].sort(
          (a, b) =>
            (DIFFICULTY_WEIGHT[a.difficulty] ?? 5) -
            (DIFFICULTY_WEIGHT[b.difficulty] ?? 5),
        )[0]?.id ?? null,
      source: 'fallback',
    };
  }

  private findWeakestSkill(skills: SkillRow[]): SkillRow | null {
    if (skills.length === 0) return null;
    const evaluated = skills.filter((s) => s.level_score !== null);
    if (evaluated.length > 0) {
      return [...evaluated].sort(
        (a, b) => (a.level_score ?? 0) - (b.level_score ?? 0),
      )[0];
    }
    return skills[0];
  }

  // ── Persistance & cache ─────────────────────────────────────────────────────

  private async saveAndCache(
    userId: string,
    result: RecommendationResult,
  ): Promise<RecommendationResult> {
    void this.supabase.client
      .from('ai_recommendations')
      .insert({
        user_id: userId,
        content: {
          ...result,
          model: this.config.get<string>('AI_MODEL') ?? null,
        },
      })
      .then(({ error }) => {
        if (error)
          this.logger.warn(`ai_recommendations insert: ${error.message}`);
      });

    this.cache.set(userId, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result;
  }
}
