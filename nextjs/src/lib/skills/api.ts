'use client';

import { apiRequest, ApiError } from '@/lib/api';
import type { AdminSkill, CoachRecommendation, SkillChallengesResponse, SkillHistoryPoint, SkillProgress, SkillStats } from './types';

type Reference = { id: string; name: string; slug: string };
type RawSkill = {
  id: string; name: string; slug: string; description?: string;
  category?: { id?: string; name: string } | null; technology?: { id?: string; name: string } | null;
  category_id?: string; technology_id?: string | null;
  is_active?: boolean; challengesCount?: number; updated_at?: string;
};
type RawProgress = {
  skill_id: string; level_score: number | null; validated_attempts: number;
  status: SkillProgress['status']; delta30d?: number | null; updated_at?: string;
  skills?: { name: string; slug: string };
};
export type AdminTechnology = { id: string; name: string; slug?: string; icon?: string; is_active: boolean; skillCount: number };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await apiRequest<T>(path, init);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) {
      window.dispatchEvent(new CustomEvent('skills-request-error', {
        detail: error instanceof Error ? error.message : 'Unable to load skills. Please try again.',
      }));
    }
    throw error;
  }
}

function adminSkill(item: RawSkill): AdminSkill {
  return {
    id: item.id, name: item.name, slug: item.slug,
    category: item.category?.name ?? 'General', technology: item.technology?.name ?? '',
    categoryId: item.category_id ?? item.category?.id,
    technologyId: item.technology_id ?? item.technology?.id ?? null,
    description: item.description ?? '', isActive: item.is_active ?? true,
    challengesCount: item.challengesCount ?? 0, updatedAt: item.updated_at,
  };
}

async function catalog(): Promise<RawSkill[]> {
  const items: RawSkill[] = [];
  let page = 1;
  let total = 0;
  do {
    const result = await call<{ items: RawSkill[]; total: number }>(`/skills?page=${page}&pageSize=100`);
    items.push(...result.items);
    total = result.total;
    if (!result.items.length) break;
    page++;
  } while (items.length < total);
  return items;
}

async function currentUserId(): Promise<string> {
  const account = await call<{ id: string }>('/me');
  return account.id;
}

export const ApiService = {
  async getMySkills(): Promise<SkillProgress[]> {
    const [progress, skills] = await Promise.all([call<RawProgress[]>('/me/skills'), catalog()]);
    const rows = new Map(progress.map(row => [row.skill_id, row]));
    const result: SkillProgress[] = skills.map(skill => {
      const row = rows.get(skill.id);
      rows.delete(skill.id);
      return {
        skillId: skill.id, name: skill.name, slug: skill.slug,
        description: skill.description, category: skill.category?.name, technology: skill.technology?.name,
        levelScore: !row || row.status === 'not_evaluated' || row.level_score === null ? null : Math.round(Number(row.level_score)),
        validatedAttempts: Number(row?.validated_attempts ?? 0), status: row?.status ?? 'not_evaluated',
        delta30d: row?.delta30d, updatedAt: row?.updated_at,
      };
    });
    for (const row of rows.values()) {
      result.push({ skillId: row.skill_id, name: row.skills?.name ?? 'Skill', slug: row.skills?.slug ?? '',
        levelScore: row.status === 'not_evaluated' || row.level_score === null ? null : Number(row.level_score),
        validatedAttempts: Number(row.validated_attempts), status: row.status, delta30d: row.delta30d, updatedAt: row.updated_at });
    }
    return result;
  },

  async getCoachRecommendation(refresh = false): Promise<CoachRecommendation> {
    const data = await call<{ observation: string; competent_in?: string; skill_id?: string; skill_name?: string; challenge_id?: string; reason?: string; source: CoachRecommendation['source'] }>(`/me/coach/recommendation${refresh ? '?refresh=true' : ''}`);
    return { observation: data.observation, competentIn: data.competent_in, skillId: data.skill_id, skillName: data.skill_name,
      challengeId: data.challenge_id, reason: data.reason, source: data.source };
  },

  async getSkillHistory(skillId: string): Promise<SkillHistoryPoint[]> {
    const data = await call<{ level_score: number | null; validated_attempts: number; recorded_at: string }[]>(`/me/skills/${encodeURIComponent(skillId)}/history`);
    return data.filter(row => row.level_score !== null).map(row => ({ levelScore: Number(row.level_score), validatedAttempts: row.validated_attempts, recordedAt: row.recorded_at }));
  },

  async getSkillChallenges(skillId: string): Promise<SkillChallengesResponse> {
    const data = await call<SkillChallengesResponse>(`/me/skills/${encodeURIComponent(skillId)}/challenges`);
    return { ...data, challenges: data.challenges.map(challenge => ({ ...challenge,
      difficulty: ({ beginner: 'easy', intermediate: 'medium', advanced: 'hard', expert: 'hard' } as Record<string, 'easy' | 'medium' | 'hard'>)[challenge.difficulty] ?? challenge.difficulty,
      state: (challenge.state as string) === 'attempted' ? 'in_progress' : challenge.state,
    })) };
  },

  async getAdminSkills(): Promise<AdminSkill[]> {
    return (await call<RawSkill[]>('/admin/skills?includeInactive=true')).map(adminSkill);
  },
  async toggleSkillActive(id: string, active: boolean): Promise<boolean> {
    await call(`/admin/skills/${encodeURIComponent(id)}/${active ? 'activate' : 'deactivate'}`, { method: 'PATCH' });
    return true;
  },
  getSkillMeta(): Promise<{ categories: Reference[]; technologies: Reference[] }> {
    return call('/admin/skills/meta');
  },
  getAdminTechnologies(includeInactive = true): Promise<AdminTechnology[]> {
    return call(`/admin/technologies?includeInactive=${includeInactive}`);
  },
  createTechnology(data: { name: string; icon?: string }): Promise<AdminTechnology> {
    return call('/admin/technologies', { method: 'POST', body: JSON.stringify(data) });
  },
  async toggleTechnologyActive(id: string, active: boolean): Promise<boolean> {
    await call(`/admin/technologies/${encodeURIComponent(id)}/${active ? 'activate' : 'deactivate'}`, { method: 'PATCH' });
    return true;
  },
  getChallenges(): Promise<{ id: string; title: string }[]> { return call('/admin/skill-challenges'); },
  getChallengeSkills(id: string): Promise<{ skills: { id: string; name: string; weight: number }[] }> {
    return call(`/admin/challenges/${encodeURIComponent(id)}/skills`);
  },
  async setChallengeSkills(id: string, skills: { skillId: string; weight: number }[]) {
    const existing = await this.getChallengeSkills(id);
    const merged = new Map(existing.skills.map(skill => [skill.id, { skillId: skill.id, weight: skill.weight }]));
    for (const skill of skills) merged.set(skill.skillId, skill);
    return call(`/admin/challenges/${encodeURIComponent(id)}/skills`, { method: 'PUT', body: JSON.stringify({ skills: [...merged.values()] }) });
  },
  async createSkill(data: { name: string; categoryId: string; technologyId?: string; description?: string }): Promise<AdminSkill> {
    return adminSkill(await call<RawSkill>('/admin/skills', { method: 'POST', body: JSON.stringify({ ...data, technologyId: data.technologyId || undefined }) }));
  },
  async updateSkill(id: string, data: { name: string; categoryId: string; technologyId: string | null; description: string }): Promise<AdminSkill> {
    return adminSkill(await call<RawSkill>(`/admin/skills/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }));
  },
  async getSkillStats(id: string): Promise<SkillStats> {
    const data = await call<{ skillId: string; name: string; usersTracked: number; evaluatedUsers: number; averageLevel: number | null; byStatus: SkillStats['levelDistribution'] }>(`/admin/skills/${encodeURIComponent(id)}/stats`);
    return { skillId: data.skillId, skillName: data.name, totalUsersEngaged: data.usersTracked, avgScore: data.averageLevel ?? 0,
      completionRate: data.usersTracked ? Math.round(data.evaluatedUsers / data.usersTracked * 100) : 0, levelDistribution: data.byStatus };
  },
  async recalculateProgress(skillId: string) {
    const userId = await currentUserId();
    return call(`/admin/progress/users/${encodeURIComponent(userId)}/skills/${encodeURIComponent(skillId)}/recalculate`, { method: 'POST' });
  },
  async simulateValidatedChallenge(challengeId: string) {
    const userId = await currentUserId();
    return call(`/admin/progress/users/${encodeURIComponent(userId)}/challenges/${encodeURIComponent(challengeId)}/simulate-validated`, { method: 'POST' });
  },
};
