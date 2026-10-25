import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from './skills-database.service';
import { ProblemQuery, ProblemWrite, TopicWrite } from './problems.dto';
@Injectable()
export class ProblemsService {
  constructor(private readonly db: SupabaseService) {}
  private check(error: { code?: string } | null) {
    if (!error) return;
    if (error.code === '23505')
      throw new ConflictException('This name, title or slug already exists.');
    if (error.code === '42501') throw new ForbiddenException();
    if (error.code === 'P0002')
      throw new NotFoundException('Problem not found.');
    if (error.code === '23503')
      throw new ConflictException(
        'This record is referenced. Archive it instead.',
      );
    if (['22023', '23514', '23502', '22P02'].includes(error.code ?? ''))
      throw new BadRequestException(
        'Check the title, statement and selected associations.',
      );
    throw new ServiceUnavailableException(
      'Problems unavailable. Check problem-topics.sql and problem-administration.sql setup.',
    );
  }
  async topics(admin = false) {
    const result = await this.db.client.rpc('problem_topic_counts', {
      p_archived: admin,
    });
    this.check(result.error);
    return result.data as unknown;
  }
  async list(user: string, query: ProblemQuery, admin = false) {
    const result = await this.db.client.rpc('problem_catalogue', {
      p_user: user,
      p_admin: admin,
      p_q: query.q,
      p_difficulty: query.difficulty,
      p_topic: query.topic ?? null,
      p_page: query.page,
      p_size: query.pageSize,
    });
    this.check(result.error);
    return result.data as unknown;
  }
  async save(dto: TopicWrite, id?: string) {
    const table = this.db.client.from('topics');
    const result = await (
      id ? table.update(dto).eq('id', id) : table.insert(dto)
    )
      .select('id,name,slug,is_active')
      .maybeSingle();
    this.check(result.error);
    if (!result.data) throw new NotFoundException('Topic not found.');
    return result.data as unknown;
  }
  async links(actor: string, id: string, topics: string[]) {
    const result = await this.db.client.rpc('problem_replace_topics', {
      p_actor: actor,
      p_problem: id,
      p_topics: topics,
    });
    this.check(result.error);
    return { saved: true };
  }
  async detail(id: string) {
    const result = await this.db.client
      .from('challenges')
      .select(
        'id,title,description,difficulty,category,duration_seconds,is_published,topic_links:challenge_topics(topic_id),skill_links:challenge_skills(skill_id,weight)',
      )
      .eq('id', id)
      .maybeSingle();
    this.check(result.error);
    if (!result.data) throw new NotFoundException('Problem not found.');
    return result.data;
  }
  async write(actor: string, id: string | null, dto: ProblemWrite) {
    const { topicIds, skills, ...fields } = dto;
    const result = await this.db.client.rpc('problem_admin_save', {
      p_actor: actor,
      p_id: id,
      p_data: fields,
      p_topics: topicIds ?? null,
      p_skills: skills ?? null,
    });
    this.checkAdministration(result.error);
    return this.detail(result.data as string);
  }
  async action(actor: string, id: string, action: string) {
    const result = await this.db.client.rpc('problem_admin_action', {
      p_actor: actor,
      p_id: id,
      p_action: action,
    });
    this.checkAdministration(result.error);
    return { saved: true };
  }
  private checkAdministration(error: { code?: string } | null) {
    if (error && ['PGRST202', '42883'].includes(error.code ?? ''))
      throw new ConflictException({
        code: 'PROBLEM_ADMINISTRATION_SETUP_REQUIRED',
        message:
          'Problem editing requires database setup. Run db/problem-administration.sql in the Supabase SQL Editor, then retry.',
      });
    this.check(error);
  }
}
