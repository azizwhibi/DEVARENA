import {
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { AuthService } from './auth.service';
import { assertSafeAuthConfig } from './auth-config';
import {
  AdminGuard,
  OptionalAuthGuard,
  RecruiterGuard,
  UserGuard,
} from './guards';
import { AuthModule } from './auth.module';
import { SupabaseService } from '../supabase/supabase.service';
import { ProblemDetailsFilter } from '../common/problem-details.filter';
import type { AuthUser } from './auth.types';

const id = '11111111-1111-4111-8111-111111111111';
const user: AuthUser = {
  id,
  email: 'dev@example.test',
  role: 'developer',
  status: 'active',
};

function setup(overrides: Record<string, string> = {}) {
  const claims = jest
    .fn()
    .mockResolvedValue({ data: { claims: { sub: id } }, error: null });
  const maybeSingle = jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve({ data: { ...user }, error: null }),
    );
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  const updateEq = jest.fn().mockResolvedValue({ error: null });
  const update = jest.fn().mockReturnValue({ eq: updateEq });
  const from = jest.fn().mockReturnValue({ select, update });
  const supabase = {
    client: { auth: { getClaims: claims }, from },
  } as unknown as SupabaseService;
  const config = new ConfigService({
    NODE_ENV: 'test',
    DEV_BYPASS_AUTH: 'false',
    DEV_USER_ID: id,
    ...overrides,
  });
  return {
    auth: new AuthService(supabase, config),
    supabase,
    config,
    claims,
    maybeSingle,
    eq,
    select,
    update,
    updateEq,
    from,
  };
}

function context(authorization?: string) {
  const req: { headers: { authorization?: string }; user?: AuthUser } = {
    headers: { authorization },
  };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { req, ctx };
}

describe('auth config safety', () => {
  it('rejects production bypass before startup', () => {
    expect(() =>
      assertSafeAuthConfig({
        NODE_ENV: 'production',
        DEV_BYPASS_AUTH: 'true',
        DEV_USER_ID: id,
      }),
    ).toThrow();
  });
  it.each(['', 'bad-id'])(
    'rejects bypass with invalid DEV_USER_ID %j',
    (value) => {
      expect(() =>
        assertSafeAuthConfig({ DEV_BYPASS_AUTH: 'true', DEV_USER_ID: value }),
      ).toThrow();
    },
  );
  it('accepts valid local bypass and production without bypass', () => {
    expect(() =>
      assertSafeAuthConfig({ DEV_BYPASS_AUTH: 'true', DEV_USER_ID: id }),
    ).not.toThrow();
    expect(() =>
      assertSafeAuthConfig({
        NODE_ENV: 'production',
        DEV_BYPASS_AUTH: 'false',
      }),
    ).not.toThrow();
  });
});

describe('AuthService', () => {
  it.each([undefined, '', 'Basic token', 'Bearer', 'Bearer a b'])(
    'rejects invalid authorization %j',
    async (header) => {
      const s = setup();
      await expect(s.auth.authenticate(header)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(s.claims).not.toHaveBeenCalled();
      expect(s.from).not.toHaveBeenCalled();
    },
  );
  it('passes the explicit JWT to getClaims and loads only trusted profile fields', async () => {
    const s = setup();
    await expect(s.auth.authenticate('Bearer a.jwt.token')).resolves.toEqual(
      user,
    );
    expect(s.claims).toHaveBeenCalledWith('a.jwt.token');
    expect(s.from).toHaveBeenCalledWith('profiles');
    expect(s.select).toHaveBeenCalledWith('id,email,role,status');
    expect(s.eq).toHaveBeenCalledWith('id', id);
  });
  it.each(['invalid', 'expired'])(
    'rejects %s token errors',
    async (message) => {
      const s = setup();
      s.claims.mockResolvedValue({ data: null, error: { message } });
      await expect(
        s.auth.authenticate('Bearer bad.jwt.token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(s.from).not.toHaveBeenCalled();
    },
  );
  it('rejects thrown verification failures', async () => {
    const s = setup();
    s.claims.mockRejectedValue(new Error('verification failed'));
    await expect(
      s.auth.authenticate('Bearer bad.jwt.token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it.each([undefined, 'not-a-uuid'])(
    'rejects a missing or invalid subject %j',
    async (sub) => {
      const s = setup();
      s.claims.mockResolvedValue({ data: { claims: { sub } }, error: null });
      await expect(
        s.auth.authenticate('Bearer a.jwt.token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );
  it('uses DEV_USER_ID in bypass but still queries the profile', async () => {
    const s = setup({ DEV_BYPASS_AUTH: 'true' });
    await expect(s.auth.authenticate()).resolves.toEqual(user);
    expect(s.claims).not.toHaveBeenCalled();
    expect(s.eq).toHaveBeenCalledWith('id', id);
  });
  it('rejects deleted users even when the JWT is valid', async () => {
    const s = setup();
    s.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(
      s.auth.authenticate('Bearer a.jwt.token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('returns 403 with a stable code for suspension', async () => {
    const s = setup();
    s.maybeSingle.mockResolvedValue({
      data: { ...user, status: 'suspended' },
      error: null,
    });
    const error = await s.auth
      .authenticate('Bearer a.jwt.token')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toEqual({
      message: 'Account suspended',
      code: 'account_suspended',
    });
  });
  it('queries on every request so suspension takes effect immediately', async () => {
    const s = setup();
    s.maybeSingle
      .mockResolvedValueOnce({ data: user, error: null })
      .mockResolvedValueOnce({
        data: { ...user, status: 'suspended' },
        error: null,
      });
    await s.auth.authenticate('Bearer a.jwt.token');
    await expect(
      s.auth.authenticate('Bearer a.jwt.token'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(s.maybeSingle).toHaveBeenCalledTimes(2);
  });
  it('fails closed with 500 on database errors', async () => {
    const s = setup();
    s.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'database unavailable' },
    });
    await expect(
      s.auth.authenticate('Bearer a.jwt.token'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
  it('syncs profile to recruiter when JWT claims user_metadata role is recruiter', async () => {
    const s = setup();
    s.claims.mockResolvedValue({
      data: { claims: { sub: id, user_metadata: { role: 'recruiter' } } },
      error: null,
    });
    const result = await s.auth.authenticate('Bearer a.jwt.token');
    expect(result.role).toBe('recruiter');
    expect(s.update).toHaveBeenCalledWith({ role: 'recruiter' });
  });
  it('never escalates to admin when JWT claims user_metadata role is admin', async () => {
    const s = setup();
    s.claims.mockResolvedValue({
      data: { claims: { sub: id, user_metadata: { role: 'admin' } } },
      error: null,
    });
    const result = await s.auth.authenticate('Bearer a.jwt.token');
    expect(result.role).toBe('developer');
    expect(s.update).not.toHaveBeenCalled();
  });
});

describe('auth guards', () => {
  it('sets req.user for UserGuard', async () => {
    const s = setup();
    const { req, ctx } = context('Bearer a.jwt.token');
    await expect(new UserGuard(s.auth).canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual(user);
  });
  it('denies a developer on AdminGuard', async () => {
    const s = setup();
    const { ctx } = context('Bearer a.jwt.token');
    await expect(
      new AdminGuard(s.auth).canActivate(ctx),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('accepts an active admin', async () => {
    const s = setup();
    s.maybeSingle.mockResolvedValue({
      data: { ...user, role: 'admin' },
      error: null,
    });
    await expect(
      new AdminGuard(s.auth).canActivate(context('Bearer a.jwt.token').ctx),
    ).resolves.toBe(true);
  });
  it('denies a developer on RecruiterGuard', async () => {
    const s = setup();
    const { ctx } = context('Bearer a.jwt.token');
    await expect(
      new RecruiterGuard(s.auth).canActivate(ctx),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('accepts an active recruiter on RecruiterGuard', async () => {
    const s = setup();
    s.maybeSingle.mockResolvedValue({
      data: { ...user, role: 'recruiter' },
      error: null,
    });
    await expect(
      new RecruiterGuard(s.auth).canActivate(context('Bearer a.jwt.token').ctx),
    ).resolves.toBe(true);
  });
  it('accepts an active admin on RecruiterGuard', async () => {
    const s = setup();
    s.maybeSingle.mockResolvedValue({
      data: { ...user, role: 'admin' },
      error: null,
    });
    await expect(
      new RecruiterGuard(s.auth).canActivate(context('Bearer a.jwt.token').ctx),
    ).resolves.toBe(true);
  });
  it('rejects a suspended recruiter on RecruiterGuard', async () => {
    const s = setup();
    s.maybeSingle.mockResolvedValue({
      data: { ...user, role: 'recruiter', status: 'suspended' },
      error: null,
    });
    await expect(
      new RecruiterGuard(s.auth).canActivate(context('Bearer a.jwt.token').ctx),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('allows anonymous requests only when the header is absent', async () => {
    const s = setup();
    const { req, ctx } = context();
    req.user = user;
    await expect(new OptionalAuthGuard(s.auth).canActivate(ctx)).resolves.toBe(
      true,
    );
    expect(req.user).toBeUndefined();
    expect(s.from).not.toHaveBeenCalled();
  });
  it('rejects a present invalid header on OptionalAuthGuard', async () => {
    const s = setup();
    await expect(
      new OptionalAuthGuard(s.auth).canActivate(context('Basic bad').ctx),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('rejects a suspended user on OptionalAuthGuard', async () => {
    const s = setup();
    s.maybeSingle.mockResolvedValue({
      data: { ...user, status: 'suspended' },
      error: null,
    });
    await expect(
      new OptionalAuthGuard(s.auth).canActivate(
        context('Bearer a.jwt.token').ctx,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('GET /me problem details integration', () => {
  let app: INestApplication<Server>;
  beforeAll(async () => {
    const s = setup();
    const module = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(SupabaseService)
      .useValue(s.supabase)
      .overrideProvider(ConfigService)
      .useValue(s.config)
      .compile();
    app = module.createNestApplication<INestApplication<Server>>();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  it('returns 401 problem+json and a Bearer challenge without a token', async () => {
    const response = await request(app.getHttpServer())
      .get('/me')
      .expect(401)
      .expect('Content-Type', /application\/problem\+json/)
      .expect('WWW-Authenticate', 'Bearer');
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 401,
        type: 'about:blank',
        instance: '/me',
      }),
    );
  });
});
