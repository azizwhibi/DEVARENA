import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  CommunityQueryDto,
  CreateCommentDto,
  CreatePostDto,
  ReportDto,
  UpdateCommentDto,
  UpdatePostDto,
} from './community.dto';

export type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
};
export type PostRecord = {
  id: string;
  author_id: string;
  title: string;
  content: string;
  status: string;
  topics: string[];
};
type Page = {
  items: PostRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

@Injectable()
export class CommunityService {
  private readonly db: SupabaseClient;
  constructor(identity: SupabaseService) {
    this.db = identity.client;
  }
  private check(error: { code?: string } | null) {
    if (!error) return;
    if (error.code === '42501')
      throw new ForbiddenException('This action is not allowed.');
    if (error.code === 'P0002')
      throw new NotFoundException('Discussion content not found.');
    if (error.code === '23505')
      throw new ConflictException(
        'This entry or pending report already exists.',
      );
    if (
      ['22023', '23503', '23514', '23502', '22P02'].includes(error.code ?? '')
    )
      throw new BadRequestException(
        'Check the content, category and selected discussion.',
      );
    if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(error.code ?? ''))
      throw new ServiceUnavailableException({
        code: 'COMMUNITY_SETUP_REQUIRED',
        message:
          'Apply db/community-integration.sql in the existing Supabase project.',
      });
    throw new ServiceUnavailableException(
      'Discussions are temporarily unavailable. Please retry.',
    );
  }
  async read<T>(
    kind: string,
    actor: string | null = null,
    id: string | null = null,
    query: object = {},
  ): Promise<T> {
    const { data, error } = await this.db
      .rpc('community_read', {
        p_kind: kind,
        p_actor: actor,
        p_id: id,
        p_query: query,
      })
      .returns<T>();
    this.check(error);
    if (data === null)
      throw new ServiceUnavailableException('Discussion data unavailable.');
    return data as T;
  }
  async write<T>(
    action: string,
    actor: string,
    id: string | null = null,
    dto: object = {},
  ): Promise<T> {
    const { data, error } = await this.db
      .rpc('community_write', {
        p_action: action,
        p_actor: actor,
        p_id: id,
        p_data: dto,
      })
      .returns<T>();
    this.check(error);
    if (data === null)
      throw new ServiceUnavailableException('Discussion result was not saved.');
    return data as T;
  }
  listCategories() {
    return this.read<CategoryRecord[]>('categories');
  }
  getSidebarData() {
    return this.read('sidebar');
  }
  listPosts(query: CommunityQueryDto, user?: string) {
    return this.read<Page>('posts', user ?? null, null, query);
  }
  listMyPosts(query: CommunityQueryDto, user: string) {
    return this.read<Page>('mine', user, null, query);
  }
  getPost(id: string, user?: string) {
    return this.read<PostRecord>('post', user ?? null, id);
  }
  createPost(dto: CreatePostDto, user: string) {
    return this.write<PostRecord>('create_post', user, null, dto);
  }
  updatePost(id: string, dto: UpdatePostDto, user: string) {
    return this.write<PostRecord>('update_post', user, id, dto);
  }
  deletePost(id: string, user: string) {
    return this.write('delete_post', user, id);
  }
  votePost(id: string, vote: number, user: string) {
    return this.write('vote', user, id, { vote });
  }
  toggleBookmark(id: string, user: string) {
    return this.write('bookmark', user, id);
  }
  async listUserBookmarks(user: string) {
    // Keep Musa's saved-post array contract while reading every paginated record.
    const items: PostRecord[] = [];
    for (let page = 1; ; page++) {
      const result = await this.read<Page>('saved', user, null, {
        page,
        limit: 50,
      });
      items.push(...result.items);
      if (page >= result.totalPages || !result.items.length) return items;
    }
  }
  listComments(id: string, user?: string) {
    return this.read('comments', user ?? null, id);
  }
  createComment(id: string, dto: CreateCommentDto, user: string) {
    return this.write('create_comment', user, id, dto);
  }
  updateComment(id: string, dto: UpdateCommentDto, user: string) {
    return this.write('update_comment', user, id, dto);
  }
  deleteComment(id: string, user: string) {
    return this.write('delete_comment', user, id);
  }
  acceptAnswer(post: string, comment: string, user: string) {
    return this.write('accept_answer', user, post, { commentId: comment });
  }
  report(dto: ReportDto, user: string) {
    return this.write('report', user, null, dto);
  }
}
