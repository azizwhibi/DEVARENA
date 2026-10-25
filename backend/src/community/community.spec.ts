import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import type { Server } from 'node:net';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthService } from '../auth/auth.service';
import { AdminGuard, OptionalAuthGuard, UserGuard } from '../auth/guards';
import { SupabaseService } from '../supabase/supabase.service';
import { CommunityController } from './community.controller';
import { AdminCommunityController } from './admin-community.controller';
import { CommunityService } from './community.service';
import { CommunityAdminService } from './community-admin.service';

describe('Discuss uses existing authentication and validated requests', () => {
  const actor = '00000000-0000-4000-8000-000000000001',
    post = '00000000-0000-4000-8000-000000000002';
  const community = {
    listCategories: jest.fn().mockResolvedValue([]),
    createPost: jest.fn().mockResolvedValue({ id: post }),
    listMyPosts: jest.fn().mockResolvedValue({ items: [] }),
    listComments: jest.fn().mockResolvedValue([]),
    votePost: jest.fn().mockResolvedValue({}),
    report: jest.fn().mockResolvedValue({}),
  };
  const admin = {
    listReports: jest.fn().mockResolvedValue([]),
    moderatePost: jest.fn().mockResolvedValue({}),
    moderateComment: jest.fn().mockResolvedValue({}),
  };
  let app: INestApplication<Server>;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CommunityController, AdminCommunityController],
      providers: [
        { provide: CommunityService, useValue: community },
        { provide: CommunityAdminService, useValue: admin },
        UserGuard,
        OptionalAuthGuard,
        AdminGuard,
        {
          provide: AuthService,
          useValue: {
            authenticate: (header?: string) => {
              if (!header) throw new UnauthorizedException();
              return {
                id: actor,
                role: header === 'Bearer admin' ? 'admin' : 'developer',
                status: 'active',
              };
            },
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => jest.clearAllMocks());
  const fields = {
    title: 'A useful question',
    content: 'How does this algorithm work?',
    categoryId: post,
    topics: ['arrays'],
  };
  it('protects writes and admin moderation while permitting published catalogue reads', async () => {
    await request(app.getHttpServer()).get('/community/categories').expect(200);
    await request(app.getHttpServer())
      .post('/community/posts')
      .send(fields)
      .expect(401);
    await request(app.getHttpServer())
      .get('/admin/community/reports')
      .set('Authorization', 'Bearer developer')
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/admin/community/posts/${post}/moderate`)
      .set('Authorization', 'Bearer developer')
      .send({ reason: 'A valid reason', isLocked: true })
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/community/reports?status=pending')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(admin.listReports).toHaveBeenCalledWith('pending', actor);
  });
  it('takes the author from the current account, not user-supplied identity', async () => {
    await request(app.getHttpServer())
      .post('/community/posts')
      .set('Authorization', 'Bearer developer')
      .send(fields)
      .expect(201);
    expect(community.createPost).toHaveBeenCalledWith(
      expect.objectContaining(fields),
      actor,
    );
    for (const body of [
      { ...fields, authorId: post },
      { ...fields, isAdmin: true },
      { ...fields, status: 'published' },
      { ...fields, title: '       ' },
      { ...fields, topics: ['x'.repeat(41)] },
    ])
      await request(app.getHttpServer())
        .post('/community/posts')
        .set('Authorization', 'Bearer developer')
        .send(body)
        .expect(400);
  });
  it('scopes private reads to the current account and passes identity for comment visibility', async () => {
    await request(app.getHttpServer())
      .get('/community/me/posts?authorId=' + post)
      .set('Authorization', 'Bearer developer')
      .expect(200);
    expect(community.listMyPosts).toHaveBeenCalledWith(
      expect.any(Object),
      actor,
    );
    await request(app.getHttpServer())
      .get(`/community/posts/${post}/comments`)
      .set('Authorization', 'Bearer developer')
      .expect(200);
    expect(community.listComments).toHaveBeenCalledWith(post, actor);
  });
  it('validates UUIDs, votes, moderation booleans and comment status', async () => {
    await request(app.getHttpServer())
      .post('/community/posts/not-an-id/vote')
      .set('Authorization', 'Bearer developer')
      .send({ vote: 1 })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/community/posts/${post}/vote`)
      .set('Authorization', 'Bearer developer')
      .send({ vote: 99 })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/admin/community/posts/${post}/moderate`)
      .set('Authorization', 'Bearer admin')
      .send({ reason: 'A valid reason', isLocked: 'false' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/admin/community/comments/${post}/moderate`)
      .set('Authorization', 'Bearer admin')
      .send({ reason: 'A valid reason', status: 'hidden' })
      .expect(200);
    expect(admin.moderateComment).toHaveBeenCalledWith(
      post,
      expect.objectContaining({ status: 'hidden' }),
      actor,
    );
    await request(app.getHttpServer())
      .get('/community/me/posts?limit=1000')
      .set('Authorization', 'Bearer developer')
      .expect(400);
  });
});

describe('Discuss database failures cannot become temporary successful writes', () => {
  function setup(result: { data: unknown; error: { code: string } | null }) {
    const rpc = jest.fn(() => ({ returns: () => Promise.resolve(result) }));
    return {
      service: new CommunityService({
        client: { rpc },
      } as unknown as SupabaseService),
      rpc,
    };
  }
  it('persists through the shared database client and sends only the authenticated actor', async () => {
    const s = setup({ data: { id: 'saved' }, error: null });
    expect(
      await s.service.createPost(
        {
          title: 'Question',
          content: 'Useful question content',
          categoryId: 'category',
        },
        'existing-user',
      ),
    ).toEqual({ id: 'saved' });
    expect(s.rpc).toHaveBeenCalledWith(
      'community_write',
      expect.objectContaining({
        p_actor: 'existing-user',
        p_action: 'create_post',
      }),
    );
  });
  it('returns a setup failure instead of silently creating in-memory posts', async () => {
    const s = setup({ data: null, error: { code: 'PGRST202' } });
    await expect(s.service.listCategories()).rejects.toMatchObject({
      status: 503,
      response: { code: 'COMMUNITY_SETUP_REQUIRED' },
    });
    await expect(
      s.service.createPost(
        {
          title: 'Question',
          content: 'Useful question content',
          categoryId: 'category',
        },
        'existing-user',
      ),
    ).rejects.toMatchObject({ status: 503 });
  });
  it('preserves authorization, missing content, duplicate and validation errors', async () => {
    for (const [code, status] of [
      ['42501', 403],
      ['P0002', 404],
      ['23505', 409],
      ['22023', 400],
    ] as const) {
      await expect(
        setup({ data: null, error: { code } }).service.write(
          'vote',
          'user',
          'post',
          { vote: 1 },
        ),
      ).rejects.toMatchObject({ status });
    }
    await expect(
      setup({ data: null, error: null }).service.write('vote', 'user', 'post', {
        vote: 1,
      }),
    ).rejects.toMatchObject({ status: 503 });
  });
});
