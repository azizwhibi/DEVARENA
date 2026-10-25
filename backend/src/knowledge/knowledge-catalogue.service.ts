import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KnowledgeStore } from './knowledge.store';
import {
  AdminKnowledgeQuery,
  KnowledgeQuery,
  ResourceDto,
  UpdateResourceDto,
} from './knowledge.dto';

export const RESOURCE_SELECT =
  '*,technology:technologies(id,name),resource_skills:knowledge_resource_skills(skill_id,skill:skills(id,name))';
export function usableResource(resource: {
  content?: string;
  external_url?: string | null;
}): boolean {
  if (resource.content?.trim()) return true;
  try {
    const url = new URL(resource.external_url ?? '');
    return (
      ['https:', 'http:'].includes(url.protocol) &&
      !!url.hostname &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
@Injectable()
export class KnowledgeCatalogueService {
  constructor(readonly store: KnowledgeStore) {}
  async meta() {
    const [skills, technologies] = await Promise.all([
      this.store.db
        .from('skills')
        .select('id,name,technology_id')
        .eq('is_active', true)
        .order('name')
        .limit(1000),
      this.store.db
        .from('technologies')
        .select('id,name')
        .eq('is_active', true)
        .order('name')
        .limit(1000),
    ]);
    this.store.check(skills.error);
    this.store.check(technologies.error);
    return { skills: skills.data ?? [], technologies: technologies.data ?? [] };
  }
  async list(query: KnowledgeQuery | AdminKnowledgeQuery, admin = false) {
    const page = query.page ?? 1,
      pageSize = query.pageSize ?? 12;
    const select =
      RESOURCE_SELECT +
      (query.skill
        ? ',filter_skills:knowledge_resource_skills!inner(skill_id)'
        : '');
    let req = this.store.db
      .from('knowledge_resources')
      .select(select, { count: 'exact' });
    if (!admin) req = req.eq('status', 'published');
    else if ((query as AdminKnowledgeQuery).status)
      req = req.eq('status', (query as AdminKnowledgeQuery).status!);
    if (query.q?.trim()) {
      const safe = query.q.replace(/[^\p{L}\p{N} \-]/gu, ' ').trim();
      if (safe)
        req = req.or(
          'title.ilike.%' + safe + '%,description.ilike.%' + safe + '%',
        );
    }
    if (query.type) req = req.eq('resource_type', query.type);
    if (query.difficulty) req = req.eq('difficulty', query.difficulty);
    if (query.technology) req = req.eq('technology_id', query.technology);
    if (query.skill) req = req.eq('filter_skills.skill_id', query.skill);
    const field = query.sort === 'title' ? 'title' : 'created_at';
    const { data, error, count } = await req
      .order(field, { ascending: query.sort !== 'newest' })
      .order('id')
      .range((page - 1) * pageSize, page * pageSize - 1);
    this.store.check(error);
    return {
      items: (data ?? []) as unknown as ({ id: string } & Record<
        string,
        unknown
      >)[],
      total: count ?? 0,
      page,
      pageSize,
    };
  }
  async resource(id: string, admin = false) {
    let req = this.store.db
      .from('knowledge_resources')
      .select(RESOURCE_SELECT)
      .eq('id', id);
    if (!admin) req = req.eq('status', 'published');
    const { data, error } = await req.maybeSingle();
    this.store.check(error);
    if (!data) throw new NotFoundException('Resource not found.');
    return data;
  }
  async detail(id: string, admin = false) {
    const resource = await this.resource(id, admin);
    const skillIds = (resource.resource_skills ?? []).map(
      (link: { skill_id: string }) => link.skill_id,
    );
    let challenges: {
      id: string;
      title: string;
      difficulty: string;
      skill_id: string;
    }[] = [];
    if (skillIds.length) {
      const result = await this.store.db
        .from('challenge_skills')
        .select(
          'skill_id,challenge:challenges!inner(id,title,difficulty,is_published)',
        )
        .in('skill_id', skillIds)
        .eq('challenge.is_published', true)
        .limit(100);
      this.store.check(result.error);
      const seen = new Set<string>();
      challenges = (result.data ?? []).flatMap((link: any) => {
        if (!link.challenge || seen.has(link.challenge.id)) return [];
        seen.add(link.challenge.id);
        return [
          {
            id: link.challenge.id,
            title: link.challenge.title,
            difficulty: link.challenge.difficulty,
            skill_id: link.skill_id,
          },
        ];
      });
    }
    return { ...resource, challenges };
  }
  async offline(id: string) {
    const resource = await this.resource(id);
    if (!resource.content?.trim())
      throw new BadRequestException(
        'This resource has no written content to download.',
      );
    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      content: resource.content,
      status: 'published' as const,
      updated_at: resource.updated_at,
      attribution: resource.attribution,
      source: resource.source,
      tags: resource.tags,
      skills: (resource.resource_skills ?? []).flatMap(
        (link: { skill_id: string; skill: { name: string } | null }) =>
          link.skill ? [{ id: link.skill_id, name: link.skill.name }] : [],
      ),
      // No resource/topic relation exists yet. Do not infer or invent topic IDs.
      topics: [],
    };
  }
  async save(
    id: string | null,
    dto: ResourceDto | UpdateResourceDto,
    actor: string,
  ) {
    const { skill_ids, ...data } = dto;
    if (typeof data.title === 'string') data.title = data.title.trim();
    if (data.title !== undefined && (!data.title || data.title.length < 2))
      throw new BadRequestException(
        'The title must contain at least two characters.',
      );
    if (id) await this.resource(id, true);
    const result = await this.store.db.rpc('knowledge_save_resource', {
      p_id: id,
      p_actor: actor,
      p_data: data,
      p_skills: skill_ids ?? null,
    });
    this.store.check(result.error);
    const saved = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!saved?.id) throw new NotFoundException('Resource not saved.');
    return this.detail(saved.id, true);
  }
  async publish(id: string) {
    const resource = await this.resource(id, true);
    if (!usableResource(resource))
      throw new BadRequestException(
        'Add content or a valid external link before publishing.',
      );
    if (!resource.title?.trim() || resource.title.trim().length < 2)
      throw new BadRequestException('Enter a title.');
    const { data, error } = await this.store.db
      .from('knowledge_resources')
      .update({
        status: 'published',
        published_at: resource.published_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    this.store.check(error);
    return data;
  }
  async archive(id: string) {
    const { data, error } = await this.store.db
      .from('knowledge_resources')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    this.store.check(error);
    return data;
  }
  async remove(id: string) {
    const { data, error } = await this.store.db
      .from('knowledge_resources')
      .delete()
      .eq('id', id)
      .eq('status', 'draft')
      .select('id');
    this.store.check(error);
    if (!data?.length)
      throw new ConflictException(
        'Only drafts can be deleted. Archive published resources instead.',
      );
    return { deleted: true };
  }
}
