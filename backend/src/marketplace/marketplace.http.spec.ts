import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import type { Server } from 'node:net';
import { AuthModule } from '../auth/auth.module';
import { SupabaseService } from '../supabase/supabase.service';
import { ProblemDetailsFilter } from '../common/problem-details.filter';
import { MarketplaceUserThrottlerGuard } from './marketplace-user-throttler.guard';
import { MarketplaceModule } from './marketplace.module';
import { MarketplaceService } from './marketplace.service';

const playerId = '33333333-3333-4333-8333-333333333333';
const otherId = '22222222-2222-4222-8222-222222222222';
const itemId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

describe('Marketplace HTTP', () => {
  let app: INestApplication<Server>;
  const service = {
    getBalance: jest.fn(),
    listItems: jest.fn(),
    getItem: jest.fn(),
    purchase: jest.fn().mockResolvedValue({
      credits_balance: 60,
      already_owned: false,
      item: { id: itemId },
    }),
    inventory: jest.fn(),
    equip: jest.fn(),
    unequip: jest.fn(),
    hint: jest.fn(),
    listAdmin: jest.fn(),
    saveItem: jest.fn(),
    archiveItem: jest.fn(),
    grant: jest.fn(),
    listChallenges: jest.fn(),
  };
  const supabase = {
    client: {
      from: jest.fn(),
      rpc: jest.fn(),
      auth: { getClaims: jest.fn() },
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
        AuthModule,
        MarketplaceModule,
      ],
    })
      .overrideProvider(SupabaseService)
      .useValue(supabase)
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => (key === 'DEV_BYPASS_AUTH' ? 'false' : undefined),
        getOrThrow: () => 'unused',
      })
      .overrideProvider(MarketplaceService)
      .useValue(service)
      .compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service.purchase.mockResolvedValue({
      credits_balance: 60,
      already_owned: false,
      item: { id: itemId },
    });
  });

  function asUser(id: string, role: 'developer' | 'admin') {
    supabase.client.auth.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: id } },
      error: null,
    });
    supabase.client.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: { id, email: 'user@devarena.test', role, status: 'active' },
              error: null,
            }),
        }),
      }),
    });
  }

  const icon = {
    kind: 'icon',
    title: 'Curseur',
    description: "Icon",
    price_credits: 40,
    status: 'published',
    preview: '>_',
  };

  it.each([
    ['get', '/admin/marketplace/items'],
    ['post', '/admin/marketplace/items'],
    ['patch', `/admin/marketplace/items/${itemId}`],
    ['post', `/admin/marketplace/items/${itemId}/archive`],
    ['post', '/admin/marketplace/credits'],
    ['get', '/admin/marketplace/challenges'],
  ] as const)('refuses a player on %s %s', async (method, url) => {
    asUser(playerId, 'developer');
    const call = request(app.getHttpServer())
      [method](url)
      .set('Authorization', 'Bearer player');
    if (method !== 'get') call.send(icon);
    await call.expect(403);
    expect(service.listAdmin).not.toHaveBeenCalled();
    expect(service.saveItem).not.toHaveBeenCalled();
    expect(service.archiveItem).not.toHaveBeenCalled();
    expect(service.grant).not.toHaveBeenCalled();
    expect(service.listChallenges).not.toHaveBeenCalled();
    expect(supabase.client.rpc).not.toHaveBeenCalled();
  });

  it('rejects an incomplete replace before any RPC', async () => {
    asUser(playerId, 'admin');
    await request(app.getHttpServer())
      .patch(`/admin/marketplace/items/${itemId}`)
      .set('Authorization', 'Bearer admin')
      .send({ kind: 'icon', title: 'Curseur' })
      .expect(400);
    expect(service.saveItem).not.toHaveBeenCalled();
    expect(supabase.client.rpc).not.toHaveBeenCalled();
  });

  it.each([0, 10001])(
    'rejects grant amount %s before any RPC',
    async (amount) => {
      asUser(playerId, 'admin');
      await request(app.getHttpServer())
        .post('/admin/marketplace/credits')
        .set('Authorization', 'Bearer admin')
        .send({ user_id: otherId, amount, reason: 'seed' })
        .expect(400);
      expect(service.grant).not.toHaveBeenCalled();
    },
  );

  it('rejects an empty grant reason before any RPC', async () => {
    asUser(playerId, 'admin');
    await request(app.getHttpServer())
      .post('/admin/marketplace/credits')
      .set('Authorization', 'Bearer admin')
      .send({ user_id: otherId, amount: 10, reason: '   ' })
      .expect(400);
    expect(service.grant).not.toHaveBeenCalled();
  });

  it('purchases with the authenticated id when the body names someone else', async () => {
    asUser(playerId, 'developer');
    await request(app.getHttpServer())
      .post(`/marketplace/items/${itemId}/purchase`)
      .set('Authorization', 'Bearer player')
      .send({ p_user_id: otherId, user_id: otherId })
      .expect(201);
    expect(service.purchase).toHaveBeenCalledWith(playerId, itemId);
  });

  it.each([
    [
      'create missing description',
      'post',
      '/admin/marketplace/items',
      { ...icon, description: undefined },
    ],
    [
      'replace missing preview',
      'patch',
      `/admin/marketplace/items/${itemId}`,
      { ...icon, preview: undefined },
    ],
    [
      'replace missing price',
      'patch',
      `/admin/marketplace/items/${itemId}`,
      { ...icon, price_credits: undefined },
    ],
    [
      'replace missing status',
      'patch',
      `/admin/marketplace/items/${itemId}`,
      { ...icon, status: undefined },
    ],
    [
      'replace missing kind',
      'patch',
      `/admin/marketplace/items/${itemId}`,
      { ...icon, kind: undefined },
    ],
    [
      'animation without key',
      'post',
      '/admin/marketplace/items',
      {
        kind: 'animation',
        title: 'Spin',
        description: 'Tourne',
        price_credits: 10,
        status: 'published',
        preview: '*',
      },
    ],
    [
      'published hint without challenge',
      'post',
      '/admin/marketplace/items',
      {
        kind: 'hint',
        title: "Hint",
        description: 'Aide',
        price_credits: 10,
        status: 'published',
        preview: '?',
        hint_body: 'secret',
      },
    ],
    [
      'hint without body',
      'post',
      '/admin/marketplace/items',
      {
        kind: 'hint',
        title: "Hint",
        description: 'Aide',
        price_credits: 10,
        status: 'draft',
        preview: '?',
      },
    ],
    [
      'unknown p_user_id',
      'post',
      '/admin/marketplace/items',
      { ...icon, p_user_id: otherId },
    ],
    [
      'hint_text rejected',
      'patch',
      `/admin/marketplace/items/${itemId}`,
      { ...icon, hint_text: 'secret' },
    ],
    [
      'animation_key on an icon',
      'post',
      '/admin/marketplace/items',
      { ...icon, animation_key: 'spin' },
    ],
    [
      'challenge_id on an icon',
      'post',
      '/admin/marketplace/items',
      { ...icon, challenge_id: itemId },
    ],
    [
      'challenge_id on an animation',
      'post',
      '/admin/marketplace/items',
      {
        kind: 'animation',
        title: 'Spin',
        description: 'Tourne',
        price_credits: 10,
        status: 'published',
        preview: '*',
        animation_key: 'spin',
        challenge_id: itemId,
      },
    ],
    [
      'animation_key on a hint',
      'post',
      '/admin/marketplace/items',
      {
        kind: 'hint',
        title: "Hint",
        description: 'Aide',
        price_credits: 10,
        status: 'draft',
        preview: '?',
        hint_body: 'secret',
        animation_key: 'spin',
      },
    ],
  ] as const)(
    'rejects %s before any RPC',
    async (_label, method, url, body) => {
      asUser(playerId, 'admin');
      await request(app.getHttpServer())
        [method](url)
        .set('Authorization', 'Bearer admin')
        .send(body)
        .expect(400);
      expect(service.saveItem).not.toHaveBeenCalled();
      expect(supabase.client.rpc).not.toHaveBeenCalled();
    },
  );

  it('rejects an actor id smuggled into a grant before any RPC', async () => {
    asUser(playerId, 'admin');
    await request(app.getHttpServer())
      .post('/admin/marketplace/credits')
      .set('Authorization', 'Bearer admin')
      .send({
        user_id: otherId,
        amount: 40,
        reason: 'seed',
        p_admin_id: otherId,
        p_user_id: playerId,
      })
      .expect(400);
    expect(service.grant).not.toHaveBeenCalled();
  });

  it('grants to the recipient and takes the actor from the session', async () => {
    asUser(playerId, 'admin');
    service.grant.mockResolvedValue({ credits_balance: 40 });
    await request(app.getHttpServer())
      .post('/admin/marketplace/credits')
      .set('Authorization', 'Bearer admin')
      .send({ user_id: otherId, amount: 40, reason: '  seed  ' })
      .expect(201);
    expect(service.grant).toHaveBeenCalledWith(playerId, otherId, 40, 'seed');
  });

  it.each([
    ['get', `/marketplace/items/not-a-uuid`],
    ['post', `/marketplace/items/not-a-uuid/purchase`],
    ['get', `/marketplace/items/not-a-uuid/hint`],
    ['patch', `/admin/marketplace/items/not-a-uuid`],
    ['post', `/admin/marketplace/items/not-a-uuid/archive`],
  ] as const)(
    'rejects a non-uuid id on %s %s before any RPC',
    async (method, url) => {
      asUser(playerId, url.startsWith('/admin') ? 'admin' : 'developer');
      const call = request(app.getHttpServer())
        [method](url)
        .set('Authorization', 'Bearer token');
      if (method !== 'get') call.send(icon);
      await call.expect(400);
      expect(service.getItem).not.toHaveBeenCalled();
      expect(service.purchase).not.toHaveBeenCalled();
      expect(service.hint).not.toHaveBeenCalled();
      expect(service.saveItem).not.toHaveBeenCalled();
      expect(service.archiveItem).not.toHaveBeenCalled();
    },
  );

  it('returns only id and title for an admin challenge list', async () => {
    asUser(playerId, 'admin');
    service.listChallenges.mockResolvedValue([
      { id: itemId, title: 'Boucle bornée' },
    ]);
    const response = await request(app.getHttpServer())
      .get('/admin/marketplace/challenges')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(service.listChallenges).toHaveBeenCalledWith(playerId);
    expect(response.body).toEqual([{ id: itemId, title: 'Boucle bornée' }]);
  });
});

describe('MarketplaceUserThrottlerGuard', () => {
  it('tracks req.user.id', async () => {
    const guard = Object.create(MarketplaceUserThrottlerGuard.prototype) as {
      getTracker: (req: Record<string, unknown>) => Promise<string>;
    };
    await expect(guard.getTracker({ user: { id: playerId } })).resolves.toBe(
      `user:${playerId}`,
    );
  });
});
