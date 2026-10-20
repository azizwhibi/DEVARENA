import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from './skills-database.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { ListSkillsDto } from './dto/list-skills.dto';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private get db() {
    return this.supabase.client;
  }

  private fail(error: { code?: string; message: string }): never {
    this.logger.error(error.message);
    if (error.code === '23505') {
      throw new ConflictException('Une competence avec ce nom existe deja.');
    }
    if (error.code === '23503') {
      throw new NotFoundException('Categorie ou technologie introuvable.');
    }
    throw new InternalServerErrorException('Une erreur est survenue.');
  }

  private async audit(
    action: string,
    entityId: string,
    actorId: string | null,
    before: unknown,
    after: unknown,
  ) {
    const { error } = await this.db.from('audit_log').insert({
      target_id: entityId,
      action: `skill.${action}`,
      actor_id: actorId,
      before,
      after,
    });
    if (error) this.logger.error(`audit_log: ${error.message}`);
  }

  async meta() {
    const [cats, techs] = await Promise.all([
      this.db
        .from('skill_categories')
        .select('id,name,slug')
        .eq('is_active', true)
        .order('name'),
      this.db
        .from('technologies')
        .select('id,name,slug')
        .eq('is_active', true)
        .order('name'),
    ]);
    if (cats.error) this.fail(cats.error);
    if (techs.error) this.fail(techs.error);
    return { categories: cats.data, technologies: techs.data };
  }

  async list(query: ListSkillsDto) {
    let req = this.db
      .from('skills')
      .select(
        'id,name,slug,description,is_active,created_at,updated_at,' +
          'category:skill_categories(id,name),' +
          'technology:technologies(id,name),' +
          'challenge_skills(count)',
      )
      .order('name');

    if (!query.includeInactive) req = req.eq('is_active', true);
    if (query.categoryId) req = req.eq('category_id', query.categoryId);
    if (query.q) req = req.ilike('name', `%${query.q.replace(/[%_]/g, '')}%`);

    const { data, error } = await req;
    if (error) this.fail(error);

    return (data ?? []).map((row: any) => {
      const { challenge_skills, ...rest } = row;
      const count = Number(challenge_skills?.[0]?.count ?? 0);
      return {
        ...rest,
        challengeCount: count,
        challenges_count: count,
        challengesCount: count,
      };
    });
  }

  async create(dto: CreateSkillDto, actorId: string | null) {
    const { data, error } = await this.db
      .from('skills')
      .insert({
        name: dto.name.trim(),
        slug: slugify(dto.name),
        description: dto.description ?? null,
        category_id: dto.categoryId,
        technology_id: dto.technologyId ?? null,
        created_by: actorId,
      })
      .select()
      .single();
    if (error) this.fail(error);

    await this.audit('create', data.id, actorId, null, data);
    return data;
  }

  private async getOrThrow(id: string) {
    const { data, error } = await this.db
      .from('skills')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('Competence introuvable.');
    return data;
  }

  async update(id: string, dto: UpdateSkillDto, actorId: string | null) {
    const before = await this.getOrThrow(id);

    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      patch.name = dto.name.trim();
      patch.slug = slugify(dto.name);
    }
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.categoryId !== undefined) patch.category_id = dto.categoryId;
    if (dto.technologyId !== undefined) patch.technology_id = dto.technologyId;

    const { data, error } = await this.db
      .from('skills')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) this.fail(error);

    await this.audit('update', id, actorId, before, data);
    return data;
  }

  // Pas de suppression physique : on desactive pour conserver l'historique.
  async setActive(id: string, isActive: boolean, actorId: string | null) {
    const before = await this.getOrThrow(id);

    const { data, error } = await this.db
      .from('skills')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();
    if (error) this.fail(error);

    await this.audit(
      isActive ? 'activate' : 'deactivate',
      id,
      actorId,
      before,
      data,
    );
    return data;
  }
}
