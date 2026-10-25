import { Test, TestingModule } from '@nestjs/testing';
import { CommunityService } from './community.service';
import { CommunityAdminService } from './community-admin.service';
import { SupabaseService } from '../supabase/supabase.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('DevArena Discuss - Community Forum Module', () => {
  let communityService: CommunityService;
  let adminService: CommunityAdminService;

  const mockSupabase = {
    client: {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST205', message: 'Table missing' } }),
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
        CommunityAdminService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    communityService = module.get<CommunityService>(CommunityService);
    adminService = module.get<CommunityAdminService>(CommunityAdminService);
  });

  it('should list pre-seeded community categories', async () => {
    const categories = await communityService.listCategories();
    expect(categories.length).toBeGreaterThanOrEqual(7);
    expect(categories.some((c) => c.slug === 'questions-help')).toBe(true);
    expect(categories.some((c) => c.slug === 'problem-discussions')).toBe(true);
  });

  it('should create and retrieve a discussion post', async () => {
    const categories = await communityService.listCategories();
    const cat = categories[0];

    const post = await communityService.createPost(
      {
        title: 'How to optimize Dijkstra algorithm in TypeScript?',
        content: 'I have a large graph with 10k nodes, how can I speed up the priority queue?',
        categoryId: cat.id,
        topics: ['algorithms', 'typescript', 'graph'],
      },
      'user-111',
    );

    expect(post).toBeDefined();
    expect(post.title).toBe('How to optimize Dijkstra algorithm in TypeScript?');
    expect(post.vote_score).toBe(0);
    expect(post.comment_count).toBe(0);

    const fetched = await communityService.getPost(post.id, 'user-111');
    expect(fetched.id).toBe(post.id);
  });

  it('should prevent authors from voting on their own posts', async () => {
    const categories = await communityService.listCategories();
    const post = await communityService.createPost(
      {
        title: 'Building a custom React hook for WebSockets',
        content: 'Here is my implementation of useWebSocket with automatic reconnection...',
        categoryId: categories[0].id,
      },
      'author-id',
    );

    await expect(
      communityService.votePost(post.id, 1, 'author-id'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow other users to upvote, downvote, and remove votes', async () => {
    const categories = await communityService.listCategories();
    const post = await communityService.createPost(
      {
        title: 'Clean Architecture with NestJS and Supabase',
        content: 'Let us discuss repository pattern vs direct client access...',
        categoryId: categories[0].id,
      },
      'author-id',
    );

    // Upvote by user 1
    const vote1 = await communityService.votePost(post.id, 1, 'voter-1');
    expect(vote1.voteScore).toBe(1);
    expect(vote1.userVote).toBe(1);

    // Upvote by user 2
    const vote2 = await communityService.votePost(post.id, 1, 'voter-2');
    expect(vote2.voteScore).toBe(2);

    // User 1 changes vote to downvote (-1)
    const voteChange = await communityService.votePost(post.id, -1, 'voter-1');
    expect(voteChange.voteScore).toBe(0); // 1 (user2) + -1 (user1) = 0

    // User 1 removes vote (0)
    const voteRemove = await communityService.votePost(post.id, 0, 'voter-1');
    expect(voteRemove.voteScore).toBe(1); // only user2 remains
  });

  it('should support bookmarking discussions', async () => {
    const categories = await communityService.listCategories();
    const post = await communityService.createPost(
      {
        title: 'Great resources for Three.js shaders',
        content: 'A comprehensive list of tutorials for vertex and fragment shaders...',
        categoryId: categories[0].id,
      },
      'user-x',
    );

    const res1 = await communityService.toggleBookmark(post.id, 'user-y');
    expect(res1.isBookmarked).toBe(true);

    const saved = await communityService.listUserBookmarks('user-y');
    expect(saved.some((p: any) => p.id === post.id)).toBe(true);

    const res2 = await communityService.toggleBookmark(post.id, 'user-y');
    expect(res2.isBookmarked).toBe(false);
  });

  it('should support comments and nested replies', async () => {
    const categories = await communityService.listCategories();
    const post = await communityService.createPost(
      {
        title: 'Tailwind CSS 4 setup feedback',
        content: 'Has anyone migrated to @tailwindcss/postcss in Next 16?',
        categoryId: categories[0].id,
      },
      'user-author',
    );

    // Root comment
    const comment = await communityService.createComment(
      post.id,
      { content: 'Yes, the migration is smooth, make sure to update @tailwindcss/postcss' },
      'user-commenter',
    );
    expect(comment.id).toBeDefined();

    // Nested reply
    const reply = await communityService.createComment(
      post.id,
      { content: 'Did you have any issues with CSS variables?', parentId: comment.id },
      'user-author',
    );
    expect(reply.parent_id).toBe(comment.id);

    const thread = await communityService.listComments(post.id);
    expect(thread.length).toBe(1); // 1 root comment
    expect(thread[0].replies?.length).toBe(1); // 1 nested reply
  });

  it('should allow author to mark accepted answer on question post', async () => {
    const categories = await communityService.listCategories();
    const post = await communityService.createPost(
      {
        title: 'How to configure RLS for public read in Supabase?',
        content: 'I want anonymous users to read published items only...',
        categoryId: categories[0].id,
      },
      'question-author',
    );

    const comment = await communityService.createComment(
      post.id,
      { content: 'Use: CREATE POLICY "Allow read" ON table FOR SELECT USING (status = \'published\');' },
      'helpful-dev',
    );

    // Non-author cannot accept answer
    await expect(
      communityService.acceptAnswer(post.id, comment.id, 'stranger'),
    ).rejects.toThrow(ForbiddenException);

    // Author accepts answer
    const accepted = await communityService.acceptAnswer(post.id, comment.id, 'question-author');
    expect(accepted.acceptedCommentId).toBe(comment.id);

    const updatedPost = await communityService.getPost(post.id);
    expect(updatedPost.accepted_comment_id).toBe(comment.id);
  });

  it('should reject new comments if post is locked by admin', async () => {
    const categories = await communityService.listCategories();
    const post = await communityService.createPost(
      {
        title: 'Heated debate about framework X vs Y',
        content: 'Which one is strictly superior in every way?',
        categoryId: categories[0].id,
      },
      'user-1',
    );

    // Admin locks discussion
    await adminService.moderatePost(
      post.id,
      { isLocked: true, reason: 'Discussions turned uncivil' },
      'admin-id',
    );

    // Attempting to comment must fail
    await expect(
      communityService.createComment(
        post.id,
        { content: 'I still want to argue!' },
        'user-2',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow users to report content and admins to review reports', async () => {
    const categories = await communityService.listCategories();
    const post = await communityService.createPost(
      {
        title: 'Spam promotional link here',
        content: 'Buy crypto right now at this shady link...',
        categoryId: categories[0].id,
      },
      'spammer',
    );

    const report = await communityService.report(
      { postId: post.id, reason: 'Spam and inappropriate promotional link' },
      'good-citizen',
    );
    expect(report.status).toBe('pending');

    const reportsList = await adminService.listReports('pending');
    expect(reportsList.some((r) => r.id === report.id)).toBe(true);

    // Admin reviews report and hides post
    await adminService.reviewReport(
      report.id,
      { status: 'reviewed', reviewNotes: 'Confirmed spam, post hidden' },
      'admin-id',
    );
    await adminService.moderatePost(
      post.id,
      { status: 'hidden', reason: 'Spam post removed' },
      'admin-id',
    );

    // Post is now hidden from normal retrieval
    await expect(communityService.getPost(post.id)).rejects.toThrow(NotFoundException);
  });
});
