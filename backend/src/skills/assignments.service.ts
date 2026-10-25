import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from './skills-database.service';

@Injectable()
export class AssignmentsService {
  constructor(private readonly database: SupabaseService) {}
  async demonstrated(userId: string) {
    const { data, error } = await this.database.client
      .from('developer_demonstrated_skills')
      .select(
        'id,name,slug,description,is_active,category,technology,solved_count,first_validated_at',
      )
      .eq('user_id', userId)
      .order('name');
    if (error)
      throw new ServiceUnavailableException(
        'Demonstrated skills unavailable. Check db/automatic-skills.sql setup.',
      );
    return data ?? [];
  }
  private check(error: { code?: string } | null) {
    if (!error) return;
    if (error.code === '42501') throw new ForbiddenException();
    if (error.code === 'P0002')
      throw new NotFoundException('Developer, skill, or challenge not found.');
    if (['22023', '22P02', '23503', '23514'].includes(error.code ?? ''))
      throw new BadRequestException('Check skill links and weights.');
    throw new InternalServerErrorException(
      'Skill links unavailable. Check the skills-management.sql migration.',
    );
  }
  async list(userId: string) {
    const { data, error } = await this.database.client
      .from('user_skill_assignments')
      .select(
        'skill:skills(id,name,slug,description,is_active,category:skill_categories(id,name),technology:technologies(id,name))',
      )
      .eq('user_id', userId)
      .eq('is_active', true);
    this.check(error);
    return (data ?? [])
      .map((row: { skill: unknown }) => row.skill)
      .filter(Boolean);
  }
  async assign(
    actorId: string,
    userId: string,
    skillId: string,
    active: boolean,
  ) {
    const { error } = await this.database.client.rpc('skills_set_assignment', {
      p_actor: actorId,
      p_user: userId,
      p_skill: skillId,
      p_active: active,
    });
    this.check(error);
    return this.list(userId);
  }
  async links(
    actorId: string,
    challengeId: string,
    skills: { skillId: string; weight?: number }[],
  ) {
    const { error } = await this.database.client.rpc(
      'skills_replace_challenge_links',
      { p_actor: actorId, p_challenge: challengeId, p_links: skills },
    );
    this.check(error);
  }
  async challenges(userId: string) {
    const { data, error } = await this.database.client
      .from('challenges')
      .select(
        'id,title,difficulty,challenge_skills(weight,skill:skills(id,name))',
      )
      .eq('is_published', true)
      .order('title');
    this.check(error);
    const attempts = await this.database.client
      .from('attempts')
      .select('challenge_id,is_validated')
      .eq('user_id', userId);
    this.check(attempts.error);
    return (data ?? []).map((row: { id: string }) => ({
      ...row,
      state: attempts.data?.some(
        (a: { challenge_id: string; is_validated: boolean }) =>
          a.challenge_id === row.id && a.is_validated,
      )
        ? 'validated'
        : 'not_started',
    }));
  }
}
