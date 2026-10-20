import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from './skills-database.service';
import { slugify } from './slugify';
import { CreateTechnologyDto, UpdateTechnologyDto } from './dto/technology.dto';

@Injectable()
export class TechnologiesService {
  private readonly logger = new Logger(TechnologiesService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private get db() {
    return this.supabase.client;
  }

  private fail(error: { code?: string; message: string }): never {
    this.logger.error(error.message);
    if (error.code === '23505') {
      throw new ConflictException('Une technologie avec ce nom existe deja.');
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
      action: `technology.${action}`,
      actor_id: actorId,
      before,
      after,
    });
    if (error) this.logger.error(`audit_log: ${error.message}`);
  }

  async list(includeInactive: boolean) {
    let req = this.db
      .from('technologies')
      .select('id,name,slug,icon,is_active,created_at,updated_at,skills(count)')
      .order('name');
    if (!includeInactive) req = req.eq('is_active', true);

    const { data, error } = await req;
    if (error) this.fail(error);

    return (data ?? []).map((row: any) => {
      const { skills, ...rest } = row;
      return { ...rest, skillCount: skills?.[0]?.count ?? 0 };
    });
  }

  async create(dto: CreateTechnologyDto, actorId: string | null) {
    const { data, error } = await this.db
      .from('technologies')
      .insert({
        name: dto.name.trim(),
        slug: slugify(dto.name),
        icon: dto.icon?.trim() || null,
      })
      .select()
      .single();
    if (error) this.fail(error);

    await this.audit('create', data.id, actorId, null, data);
    return data;
  }

  private async getOrThrow(id: string) {
    const { data, error } = await this.db
      .from('technologies')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException('Technologie introuvable.');
    return data;
  }

  async update(id: string, dto: UpdateTechnologyDto, actorId: string | null) {
    const before = await this.getOrThrow(id);

    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      patch.name = dto.name.trim();
      patch.slug = slugify(dto.name);
    }
    if (dto.icon !== undefined) patch.icon = dto.icon.trim() || null;

    const { data, error } = await this.db
      .from('technologies')
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
      .from('technologies')
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
