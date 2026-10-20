import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SkillProgressService } from '../skills/skill-progress.service';
import { MIN_ATTEMPTS, THRESHOLDS } from '../skills/scoring/scoring.config';
import { KnowledgeStore } from './knowledge.store';
import { RESOURCE_SELECT } from './knowledge-catalogue.service';
export type Candidate = {
  id: string;
  title: string;
  status: string;
  difficulty: string;
  technology_id: string | null;
  resource_skills: { skill_id: string; skill?: { name: string } }[];
};
export type Measurement = {
  skill_id: string;
  level_score: number | null;
  status: string;
  validated_attempts: number;
};
export function rankResources(
  resources: Candidate[],
  progress: Measurement[],
  interests: Set<string>,
  excluded: Set<string>,
) {
  const measured = progress.filter(
    (row) =>
      ['beginner', 'intermediate', 'advanced', 'expert'].includes(row.status) &&
      row.level_score !== null &&
      Number.isFinite(Number(row.level_score)) &&
      Number(row.level_score) >= 0 &&
      Number(row.level_score) <= 100 &&
      row.validated_attempts >= MIN_ATTEMPTS,
  );
  return resources
    .filter(
      (resource) =>
        resource.status === 'published' && !excluded.has(resource.id),
    )
    .map((resource) => {
      const linked = measured
        .filter((row) =>
          resource.resource_skills.some(
            (link) => link.skill_id === row.skill_id,
          ),
        )
        .sort((a, b) => Number(a.level_score) - Number(b.level_score));
      const target = linked[0];
      const interest =
        !!resource.technology_id && interests.has(resource.technology_id);
      const preferred = target
        ? Number(target.level_score) < THRESHOLDS.intermediate
          ? 'beginner'
          : Number(target.level_score) < THRESHOLDS.advanced
            ? 'intermediate'
            : 'advanced'
        : 'beginner';
      const gap = !!target && Number(target.level_score) < THRESHOLDS.advanced;
      const score =
        (gap ? 100 - Number(target!.level_score) : target ? 10 : 0) +
        (interest ? 40 : 0) +
        (resource.difficulty === preferred
          ? 8
          : resource.difficulty === 'unknown'
            ? 0
            : -4);
      const explanation = gap
        ? 'Renforce une compétence évaluée en cours de développement.'
        : interest
          ? 'Correspond à une technologie choisie dans votre profil.'
          : target
            ? 'Approfondit une compétence déjà évaluée.'
            : 'Une ressource publiée à découvrir.';
      return {
        resource,
        score,
        target_skill_id: target?.skill_id ?? null,
        explanation,
        evidence: {
          level_score: target?.level_score ?? null,
          validated_attempts: target?.validated_attempts ?? null,
          technology_interest: interest,
          difficulty: resource.difficulty,
          scoring: 'existing-skills',
          self_reported_completion_excluded: true,
        },
      };
    })
    .sort(
      (a, b) => b.score - a.score || a.resource.id.localeCompare(b.resource.id),
    );
}
@Injectable()
export class KnowledgeRecommendationsService {
  constructor(
    private readonly store: KnowledgeStore,
    private readonly skills: SkillProgressService,
  ) {}
  async recommend(userId: string) {
    const [resources, progress, interests] = await Promise.all([
      this.store.db
        .from('knowledge_resources')
        .select(RESOURCE_SELECT)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .order('id')
        .limit(200),
      this.skills.getUserProgress(userId),
      this.store.db
        .from('profile_technologies')
        .select('technology_id')
        .eq('profile_id', userId),
    ]);
    this.store.check(resources.error);
    const candidateIds = (resources.data ?? []).map((resource) => resource.id);
    const [completed, feedback] = candidateIds.length
      ? await Promise.all([
          this.store.db
            .from('knowledge_progress')
            .select('resource_id')
            .eq('user_id', userId)
            .eq('state', 'completed')
            .in('resource_id', candidateIds),
          this.store.db
            .from('knowledge_feedback')
            .select('resource_id')
            .eq('user_id', userId)
            .eq('feedback', 'not_relevant')
            .in('resource_id', candidateIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];
    const missingInterests = ['PGRST205', '42P01'].includes(
      interests.error?.code ?? '',
    );
    if (!missingInterests) this.store.check(interests.error);
    for (const result of [resources, completed, feedback])
      this.store.check(result.error);
    const excluded = new Set<string>(
      [...(completed.data ?? []), ...(feedback.data ?? [])].map(
        (row) => row.resource_id,
      ),
    );
    const ranked = rankResources(
      (resources.data ?? []) as Candidate[],
      (progress ?? []) as Measurement[],
      new Set((interests.data ?? []).map((row) => row.technology_id)),
      excluded,
    ).slice(0, 6);
    const batchId = randomUUID();
    if (!ranked.length)
      return { batch_id: batchId, method: 'deterministic-v1', items: [] };
    const [available, latestCompletion] = await Promise.all([
      this.store.db
        .from('knowledge_resources')
        .select(RESOURCE_SELECT)
        .in(
          'id',
          ranked.map((item) => item.resource.id),
        )
        .eq('status', 'published'),
      this.store.db
        .from('knowledge_progress')
        .select('resource_id')
        .eq('user_id', userId)
        .eq('state', 'completed')
        .in(
          'resource_id',
          ranked.map((item) => item.resource.id),
        ),
    ]);
    this.store.check(available.error);
    this.store.check(latestCompletion.error);
    const done = new Set(
      (latestCompletion.data ?? []).map((row) => row.resource_id),
    );
    const live = new Map(
      (available.data ?? []).map((resource) => [resource.id, resource]),
    );
    const final = ranked.filter(
      (item) => live.has(item.resource.id) && !done.has(item.resource.id),
    );
    if (!final.length)
      return { batch_id: batchId, method: 'deterministic-v1', items: [] };
    const rows = final.map((item, index) => ({
      id: randomUUID(),
      user_id: userId,
      resource_id: item.resource.id,
      batch_id: batchId,
      position: index + 1,
      target_skill_id: item.target_skill_id,
      method: 'deterministic-v1',
      explanation: item.explanation,
      evidence: { ...item.evidence, interests_available: !missingInterests },
    }));
    const { error } = await this.store.db
      .from('knowledge_recommendations')
      .insert(rows);
    this.store.check(error);
    return {
      batch_id: batchId,
      method: 'deterministic-v1',
      items: final.map((item, index) => ({
        recommendation_id: rows[index].id,
        resource: live.get(item.resource.id),
        explanation: item.explanation,
      })),
    };
  }
}
