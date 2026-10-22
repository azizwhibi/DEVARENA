import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from './skills-database.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private get db() {
    return this.supabase.client;
  }

  private fail(error: { code?: string; message: string }): never {
    this.logger.error(error.message);
    if (error.code === '23505') {
      throw new ConflictException("A category with this name already exists.");
    }
    throw new InternalServerErrorException("Something went wrong. Please retry.");
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
      action: `skill_category.${action}`,
      actor_id: actorId,
      before,
      after,
    });
    if (error) this.logger.error(`audit_log: ${error.message}`);
  }

  private async getOrThrow(id: string) {
    const { data, error } = await this.db
      .from('skill_categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException("Category not found.");
    return data;
  }

  async list(includeInactive: boolean) {
    let req = this.db
      .from('skill_categories')
      .select(
        'id, name, slug, is_active, created_at, updated_at, skills(count)',
      )
      .order('name');
    if (!includeInactive) req = req.eq('is_active', true);

    const { data, error } = await req;
    if (error) this.fail(error);

    return (data ?? []).map((row) => {
      const { skills, ...rest } = row as typeof row & {
        skills?: { count: number }[];
      };
      return { ...rest, skillCount: skills?.[0]?.count ?? 0 };
    });
  }

  async create(dto: CreateCategoryDto, actorId: string | null) {
    const { data, error } = await this.db
      .from('skill_categories')
      .insert({ name: dto.name.trim(), slug: slugify(dto.name) })
      .select()
      .single();
    if (error) this.fail(error);

    await this.audit('create', data.id, actorId, null, data);
    return data;
  }

  async update(id: string, dto: UpdateCategoryDto, actorId: string | null) {
    const before = await this.getOrThrow(id);

    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      patch.name = dto.name.trim();
      patch.slug = slugify(dto.name);
    }
    if (Object.keys(patch).length === 0) return before;

    const { data, error } = await this.db
      .from('skill_categories')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) this.fail(error);

    await this.audit('update', id, actorId, before, data);
    return data;
  }

  async setActive(id: string, isActive: boolean, actorId: string | null) {
    const before = await this.getOrThrow(id);

    const { data, error } = await this.db
      .from('skill_categories')
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
