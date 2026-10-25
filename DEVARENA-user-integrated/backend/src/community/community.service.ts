import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  CommunityQueryDto,
  CreateCommentDto,
  CreatePostDto,
  ReportDto,
  UpdateCommentDto,
  UpdatePostDto,
} from './community.dto';

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface PostRecord {
  id: string;
  author_id: string;
  category_id: string;
  title: string;
  content: string;
  status: 'published' | 'hidden' | 'archived';
  is_locked: boolean;
  is_pinned: boolean;
  is_edited: boolean;
  accepted_comment_id: string | null;
  linked_challenge_id: string | null;
  linked_resource_id: string | null;
  vote_score: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  topics?: string[];
  author?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  category?: CategoryRecord;
  userVote?: number;
  isBookmarked?: boolean;
}

export interface CommentRecord {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  status: 'published' | 'hidden' | 'deleted';
  is_accepted: boolean;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  replies?: CommentRecord[];
}

export interface VoteRecord {
  post_id: string;
  user_id: string;
  vote_type: number;
  created_at: string;
}

export interface BookmarkRecord {
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface ReportRecord {
  id: string;
  reporter_id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

function isSchemaCacheMissing(err: any): boolean {
  if (!err) return false;
  return (
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    (typeof err.message === 'string' &&
      /schema cache|relation .* does not exist/i.test(err.message))
  );
}

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  // In-memory resilient storage if tables are not yet migrated in Supabase
  private memoryCategories: Map<string, CategoryRecord> = new Map();
  private memoryPosts: Map<string, PostRecord> = new Map();
  private memoryComments: Map<string, CommentRecord> = new Map();
  private memoryVotes: Map<string, VoteRecord> = new Map(); // key: `${post_id}:${user_id}`
  private memoryBookmarks: Map<string, BookmarkRecord> = new Map(); // key: `${post_id}:${user_id}`
  private memoryReports: Map<string, ReportRecord> = new Map();
  private isUsingMemory = false;

  constructor(private readonly supabase: SupabaseService) {
    this.seedDefaultCategories();
  }

  private seedDefaultCategories() {
    const defaults = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Questions & Help',
        slug: 'questions-help',
        description:
          'Ask technical questions and get answers from the community',
        icon: 'help-circle',
        color: 'amber',
        display_order: 1,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Problem Discussions',
        slug: 'problem-discussions',
        description: 'Debate DevArena challenges, algorithms and edge cases',
        icon: 'code',
        color: 'violet',
        display_order: 2,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Solutions & Approaches',
        slug: 'solutions-approaches',
        description: 'Share clean architectures, patterns and optimized code',
        icon: 'sparkles',
        color: 'emerald',
        display_order: 3,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        name: 'Tutorials & Resources',
        slug: 'tutorials-resources',
        description:
          'Comprehensive guides, deep-dives and curated developer material',
        icon: 'book-open',
        color: 'blue',
        display_order: 4,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Projects & Feedback',
        slug: 'projects-feedback',
        description:
          'Showcase your builds, request code reviews and get constructive advice',
        icon: 'rocket',
        color: 'fuchsia',
        display_order: 5,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '66666666-6666-4666-8666-666666666666',
        name: 'Career & Interviews',
        slug: 'career-interviews',
        description:
          'Tech hiring, resume guidance, mock interviews and career growth',
        icon: 'briefcase',
        color: 'indigo',
        display_order: 6,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '77777777-7777-4777-8777-777777777777',
        name: 'Announcements',
        slug: 'announcements',
        description:
          'Official DevArena updates, release notes and community events',
        icon: 'megaphone',
        color: 'rose',
        display_order: 7,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];

    for (const c of defaults) {
      this.memoryCategories.set(c.id, c);
    }
  }

  // Helper to fetch profile details
  private async getProfile(userId: string) {
    try {
      const { data } = await this.supabase.client
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', userId)
        .single();
      if (data) return data;
    } catch {
      // ignore
    }
    return {
      id: userId,
      username: `Developer-${userId.slice(0, 6)}`,
      avatar_url: null,
    };
  }

  // --- CATEGORIES ---
  async listCategories(): Promise<CategoryRecord[]> {
    if (!this.isUsingMemory) {
      try {
        const { data, error } = await this.supabase.client
          .from('community_categories' as any)
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          return data as unknown as CategoryRecord[];
        }
        if (isSchemaCacheMissing(error)) {
          this.isUsingMemory = true;
          this.logger.warn('Community tables missing; fallback to in-memory.');
        }
      } catch (err) {
        this.isUsingMemory = true;
      }
    }
    return Array.from(this.memoryCategories.values())
      .filter((c) => c.is_active)
      .sort((a, b) => a.display_order - b.display_order);
  }

  async getCategoryById(id: string): Promise<CategoryRecord | undefined> {
    const list = await this.listCategories();
    return list.find((c) => c.id === id || c.slug === id);
  }

  // --- POSTS ---
  async listPosts(query: CommunityQueryDto, currentUserId?: string) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 15));
    const offset = (page - 1) * limit;

    let items: PostRecord[] = [];
    let total = 0;

    if (!this.isUsingMemory) {
      try {
        let qb = this.supabase.client
          .from('community_posts' as any)
          .select(
            '*, category:community_categories(*), author:profiles(id, username, avatar_url)',
            { count: 'exact' },
          )
          .eq('status', 'published');

        if (query.authorId) {
          qb = qb.eq('author_id', query.authorId);
        }
        if (query.category) {
          qb = qb.eq('category_id', query.category);
        }
        if (query.search) {
          qb = qb.or(
            `title.ilike.%${query.search}%,content.ilike.%${query.search}%`,
          );
        }

        // Sorting
        if (query.sort === 'votes') {
          qb = qb.order('vote_score', { ascending: false });
        } else if (query.sort === 'comments') {
          qb = qb.order('comment_count', { ascending: false });
        } else {
          qb = qb
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });
        }

        qb = qb.range(offset, offset + limit - 1);

        const { data, count, error } = await qb;
        if (!error && data) {
          items = data as unknown as PostRecord[];
          total = count ?? data.length;
        } else if (isSchemaCacheMissing(error)) {
          this.isUsingMemory = true;
        }
      } catch {
        this.isUsingMemory = true;
      }
    }

    if (this.isUsingMemory) {
      let filtered = Array.from(this.memoryPosts.values()).filter(
        (p) => p.status === 'published',
      );

      if (query.authorId) {
        filtered = filtered.filter((p) => p.author_id === query.authorId);
      }
      if (query.category) {
        const cat = await this.getCategoryById(query.category);
        if (cat) {
          filtered = filtered.filter((p) => p.category_id === cat.id);
        }
      }
      if (query.topic) {
        const target = query.topic.toLowerCase();
        filtered = filtered.filter(
          (p) => p.topics && p.topics.some((t) => t.toLowerCase() === target),
        );
      }
      if (query.search) {
        const s = query.search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.title.toLowerCase().includes(s) ||
            p.content.toLowerCase().includes(s),
        );
      }

      if (query.sort === 'votes') {
        filtered.sort((a, b) => b.vote_score - a.vote_score);
      } else if (query.sort === 'comments') {
        filtered.sort((a, b) => b.comment_count - a.comment_count);
      } else {
        filtered.sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
      }

      total = filtered.length;
      items = filtered.slice(offset, offset + limit);
    }

    // Decorate with current user vote and bookmark status
    const decorated = await Promise.all(
      items.map(async (post) => {
        let userVote = 0;
        let isBookmarked = false;
        if (currentUserId) {
          const voteKey = `${post.id}:${currentUserId}`;
          const existingVote = this.memoryVotes.get(voteKey);
          if (existingVote) userVote = existingVote.vote_type;

          const bmKey = `${post.id}:${currentUserId}`;
          isBookmarked = this.memoryBookmarks.has(bmKey);
        }

        const category =
          post.category || (await this.getCategoryById(post.category_id));
        const author = post.author || (await this.getProfile(post.author_id));

        return {
          ...post,
          category,
          author,
          userVote,
          isBookmarked,
        };
      }),
    );

    return {
      items: decorated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPost(id: string, currentUserId?: string): Promise<PostRecord> {
    let post: PostRecord | null = null;

    if (!this.isUsingMemory) {
      try {
        const { data, error } = await this.supabase.client
          .from('community_posts' as any)
          .select(
            '*, category:community_categories(*), author:profiles(id, username, avatar_url)',
          )
          .eq('id', id)
          .single();

        if (!error && data) {
          post = data as unknown as PostRecord;
        } else if (isSchemaCacheMissing(error)) {
          this.isUsingMemory = true;
        }
      } catch {
        this.isUsingMemory = true;
      }
    }

    if (this.isUsingMemory || !post) {
      post = this.memoryPosts.get(id) ?? null;
    }

    if (!post || post.status === 'hidden') {
      throw new NotFoundException('Discussion post not found.');
    }

    let userVote = 0;
    let isBookmarked = false;
    if (currentUserId) {
      const voteKey = `${post.id}:${currentUserId}`;
      const v = this.memoryVotes.get(voteKey);
      if (v) userVote = v.vote_type;

      const bmKey = `${post.id}:${currentUserId}`;
      isBookmarked = this.memoryBookmarks.has(bmKey);
    }

    const category =
      post.category || (await this.getCategoryById(post.category_id));
    const author = post.author || (await this.getProfile(post.author_id));

    return {
      ...post,
      category,
      author,
      userVote,
      isBookmarked,
    };
  }

  async createPost(dto: CreatePostDto, authorId: string): Promise<PostRecord> {
    const category = await this.getCategoryById(dto.categoryId);
    if (!category) {
      throw new BadRequestException('Selected category does not exist.');
    }

    const newPost: PostRecord = {
      id: randomUUID(),
      author_id: authorId,
      category_id: category.id,
      title: dto.title.trim(),
      content: dto.content.trim(),
      status: 'published',
      is_locked: false,
      is_pinned: false,
      is_edited: false,
      accepted_comment_id: null,
      linked_challenge_id: dto.linkedChallengeId ?? null,
      linked_resource_id: dto.linkedResourceId ?? null,
      vote_score: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      topics: dto.topics ?? [],
    };

    if (!this.isUsingMemory) {
      try {
        const { data, error } = await this.supabase.client
          .from('community_posts' as any)
          .insert({
            id: newPost.id,
            author_id: newPost.author_id,
            category_id: newPost.category_id,
            title: newPost.title,
            content: newPost.content,
            status: newPost.status,
            linked_challenge_id: newPost.linked_challenge_id,
            linked_resource_id: newPost.linked_resource_id,
          })
          .select()
          .single();

        if (error && isSchemaCacheMissing(error)) {
          this.isUsingMemory = true;
        } else if (data) {
          // Add topics
          if (dto.topics && dto.topics.length > 0) {
            await this.supabase.client
              .from('community_post_topics' as any)
              .insert(
                dto.topics.map((t) => ({ post_id: newPost.id, topic_name: t })),
              );
          }
        }
      } catch {
        this.isUsingMemory = true;
      }
    }

    this.memoryPosts.set(newPost.id, newPost);
    return this.getPost(newPost.id, authorId);
  }

  async updatePost(
    id: string,
    dto: UpdatePostDto,
    userId: string,
    isAdmin = false,
  ): Promise<PostRecord> {
    const post = await this.getPost(id);
    if (post.author_id !== userId && !isAdmin) {
      throw new ForbiddenException('You can only edit your own posts.');
    }

    if (dto.categoryId) {
      const cat = await this.getCategoryById(dto.categoryId);
      if (!cat) throw new BadRequestException('Invalid category.');
      post.category_id = cat.id;
    }

    if (dto.title) post.title = dto.title.trim();
    if (dto.content) post.content = dto.content.trim();
    if (dto.topics) post.topics = dto.topics;
    if (dto.linkedChallengeId !== undefined)
      post.linked_challenge_id = dto.linkedChallengeId ?? null;
    if (dto.linkedResourceId !== undefined)
      post.linked_resource_id = dto.linkedResourceId ?? null;

    post.is_edited = true;
    post.updated_at = new Date().toISOString();

    if (!this.isUsingMemory) {
      try {
        await this.supabase.client
          .from('community_posts' as any)
          .update({
            title: post.title,
            content: post.content,
            category_id: post.category_id,
            is_edited: true,
            updated_at: post.updated_at,
          })
          .eq('id', id);
      } catch {
        // ignore
      }
    }

    this.memoryPosts.set(id, post);
    return this.getPost(id, userId);
  }

  async deletePost(id: string, userId: string, isAdmin = false): Promise<void> {
    const post = await this.getPost(id);
    if (post.author_id !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own posts.');
    }

    if (!this.isUsingMemory) {
      try {
        await this.supabase.client
          .from('community_posts' as any)
          .delete()
          .eq('id', id);
      } catch {
        // ignore
      }
    }

    this.memoryPosts.delete(id);
  }

  // --- VOTES ---
  async votePost(
    postId: string,
    voteValue: number,
    userId: string,
  ): Promise<{ voteScore: number; userVote: number }> {
    const post = await this.getPost(postId);
    if (post.author_id === userId) {
      throw new BadRequestException('Authors cannot vote on their own posts.');
    }

    const voteKey = `${postId}:${userId}`;
    const existing = this.memoryVotes.get(voteKey);

    let delta = 0;
    if (voteValue === 0) {
      // remove vote
      if (existing) {
        delta = -existing.vote_type;
        this.memoryVotes.delete(voteKey);
      }
    } else {
      const prev = existing ? existing.vote_type : 0;
      delta = voteValue - prev;
      this.memoryVotes.set(voteKey, {
        post_id: postId,
        user_id: userId,
        vote_type: voteValue,
        created_at: new Date().toISOString(),
      });
    }

    post.vote_score = (post.vote_score || 0) + delta;
    this.memoryPosts.set(postId, post);

    if (!this.isUsingMemory) {
      try {
        if (voteValue === 0) {
          await this.supabase.client
            .from('community_post_votes' as any)
            .delete()
            .match({ post_id: postId, user_id: userId });
        } else {
          await this.supabase.client.from('community_post_votes' as any).upsert(
            {
              post_id: postId,
              user_id: userId,
              vote_type: voteValue,
            },
            { onConflict: 'post_id,user_id' },
          );
        }
        await this.supabase.client
          .from('community_posts' as any)
          .update({ vote_score: post.vote_score })
          .eq('id', postId);
      } catch {
        // fallback active
      }
    }

    return { voteScore: post.vote_score, userVote: voteValue };
  }

  // --- BOOKMARKS ---
  async toggleBookmark(
    postId: string,
    userId: string,
  ): Promise<{ isBookmarked: boolean }> {
    await this.getPost(postId); // verify existence
    const bmKey = `${postId}:${userId}`;
    const exists = this.memoryBookmarks.has(bmKey);

    if (exists) {
      this.memoryBookmarks.delete(bmKey);
      if (!this.isUsingMemory) {
        try {
          await this.supabase.client
            .from('community_bookmarks' as any)
            .delete()
            .match({ post_id: postId, user_id: userId });
        } catch {
          // ignore
        }
      }
      return { isBookmarked: false };
    } else {
      this.memoryBookmarks.set(bmKey, {
        post_id: postId,
        user_id: userId,
        created_at: new Date().toISOString(),
      });
      if (!this.isUsingMemory) {
        try {
          await this.supabase.client.from('community_bookmarks' as any).insert({
            post_id: postId,
            user_id: userId,
          });
        } catch {
          // ignore
        }
      }
      return { isBookmarked: true };
    }
  }

  async listUserBookmarks(userId: string) {
    const postIds = Array.from(this.memoryBookmarks.values())
      .filter((b) => b.user_id === userId)
      .map((b) => b.post_id);

    const posts = await Promise.all(
      postIds.map(async (id) => {
        try {
          return await this.getPost(id, userId);
        } catch {
          return null;
        }
      }),
    );
    return posts.filter(Boolean);
  }

  // --- COMMENTS ---
  async listComments(postId: string): Promise<CommentRecord[]> {
    await this.getPost(postId);
    const comments = Array.from(this.memoryComments.values()).filter(
      (c) => c.post_id === postId && c.status !== 'hidden',
    );

    // Decorate author
    const decorated = await Promise.all(
      comments.map(async (c) => ({
        ...c,
        author: await this.getProfile(c.author_id),
      })),
    );

    // Build hierarchy (nested up to 2 levels)
    const roots: CommentRecord[] = [];
    const byId = new Map<string, CommentRecord>();

    for (const c of decorated) {
      byId.set(c.id, { ...c, replies: [] });
    }

    for (const c of byId.values()) {
      if (c.parent_id && byId.has(c.parent_id)) {
        byId.get(c.parent_id)!.replies!.push(c);
      } else {
        roots.push(c);
      }
    }

    // Sort by accepted first, then oldest/created_at
    roots.sort((a, b) => {
      if (a.is_accepted !== b.is_accepted) return a.is_accepted ? -1 : 1;
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    return roots;
  }

  async createComment(
    postId: string,
    dto: CreateCommentDto,
    authorId: string,
  ): Promise<CommentRecord> {
    const post = await this.getPost(postId);
    if (post.is_locked) {
      throw new BadRequestException('This discussion is locked.');
    }

    if (dto.parentId) {
      const parent = this.memoryComments.get(dto.parentId);
      if (!parent || parent.post_id !== postId) {
        throw new BadRequestException(
          'Parent comment does not exist in this discussion.',
        );
      }
    }

    const comment: CommentRecord = {
      id: randomUUID(),
      post_id: postId,
      author_id: authorId,
      parent_id: dto.parentId ?? null,
      content: dto.content.trim(),
      status: 'published',
      is_accepted: false,
      is_edited: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.memoryComments.set(comment.id, comment);

    // Update post comment count
    post.comment_count = (post.comment_count || 0) + 1;
    this.memoryPosts.set(postId, post);

    const author = await this.getProfile(authorId);
    return { ...comment, author, replies: [] };
  }

  async updateComment(
    id: string,
    dto: UpdateCommentDto,
    userId: string,
    isAdmin = false,
  ): Promise<CommentRecord> {
    const comment = this.memoryComments.get(id);
    if (!comment) throw new NotFoundException('Comment not found.');
    if (comment.author_id !== userId && !isAdmin) {
      throw new ForbiddenException('You can only edit your own comment.');
    }

    comment.content = dto.content.trim();
    comment.is_edited = true;
    comment.updated_at = new Date().toISOString();
    this.memoryComments.set(id, comment);

    const author = await this.getProfile(comment.author_id);
    return { ...comment, author };
  }

  async deleteComment(
    id: string,
    userId: string,
    isAdmin = false,
  ): Promise<void> {
    const comment = this.memoryComments.get(id);
    if (!comment) throw new NotFoundException('Comment not found.');
    if (comment.author_id !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own comment.');
    }

    const hasChildren = Array.from(this.memoryComments.values()).some(
      (c) => c.parent_id === id,
    );

    const post = this.memoryPosts.get(comment.post_id);
    if (hasChildren) {
      // preserve discussion structure
      comment.content = '[This comment was deleted by its author]';
      comment.status = 'deleted';
      this.memoryComments.set(id, comment);
    } else {
      this.memoryComments.delete(id);
      if (post && post.comment_count > 0) {
        post.comment_count -= 1;
        this.memoryPosts.set(post.id, post);
      }
    }
  }

  async acceptAnswer(
    postId: string,
    commentId: string,
    userId: string,
  ): Promise<{ acceptedCommentId: string | null }> {
    const post = await this.getPost(postId);
    if (post.author_id !== userId) {
      throw new ForbiddenException(
        'Only the discussion author can accept an answer.',
      );
    }

    const comment = this.memoryComments.get(commentId);
    if (!comment || comment.post_id !== postId) {
      throw new BadRequestException('Comment does not belong to this post.');
    }

    // Toggle accept
    if (post.accepted_comment_id === commentId) {
      post.accepted_comment_id = null;
      comment.is_accepted = false;
    } else {
      // Unaccept previously accepted comment
      if (post.accepted_comment_id) {
        const prev = this.memoryComments.get(post.accepted_comment_id);
        if (prev) prev.is_accepted = false;
      }
      post.accepted_comment_id = commentId;
      comment.is_accepted = true;
    }

    this.memoryPosts.set(postId, post);
    this.memoryComments.set(commentId, comment);
    return { acceptedCommentId: post.accepted_comment_id };
  }

  // --- REPORTS ---
  async report(dto: ReportDto, reporterId: string): Promise<ReportRecord> {
    if (!dto.postId && !dto.commentId) {
      throw new BadRequestException(
        'Either postId or commentId must be provided.',
      );
    }

    const report: ReportRecord = {
      id: randomUUID(),
      reporter_id: reporterId,
      post_id: dto.postId ?? null,
      comment_id: dto.commentId ?? null,
      reason: dto.reason.trim(),
      status: 'pending',
      reviewed_by: null,
      review_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.memoryReports.set(report.id, report);
    return report;
  }

  // --- SIDEBAR DATA ---
  async getSidebarData() {
    const allPosts = Array.from(this.memoryPosts.values()).filter(
      (p) => p.status === 'published',
    );
    const announcements = allPosts.filter((p) => p.is_pinned).slice(0, 3);
    const popular = allPosts
      .slice()
      .sort((a, b) => b.vote_score + b.comment_count - (a.vote_score + a.comment_count))
      .slice(0, 5);
    const categories = await this.listCategories();

    return {
      announcements,
      popular,
      categories,
    };
  }
}
