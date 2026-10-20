import {
  BadRequestException,
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import type { Server } from 'node:net';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from './users.module';
import { UsersService } from './users.service';
import { AccountService } from '../auth/account.service';
import { ProblemDetailsFilter } from '../common/problem-details.filter';
import { escapeSearchTerm } from './dto/list-users.query';

interface MockAuthAdmin {
  updateUserById: jest.Mock;
  deleteUser: jest.Mock;
}

interface MockAuth {
  getClaims: jest.Mock;
  admin: MockAuthAdmin;
}

interface MockStorage {
  from: jest.Mock;
}

interface MockSupabaseClient {
  from: jest.Mock;
  rpc: jest.Mock;
  auth: MockAuth;
  storage: MockStorage;
}

interface MockSupabaseService {
  client: MockSupabaseClient;
}

describe('Admin Users (T18–T21)', () => {
  const adminId = '11111111-1111-4111-8111-111111111111';
  const targetId = '22222222-2222-4222-8222-222222222222';
  const devId = '33333333-3333-4333-8333-333333333333';

  describe('escapeSearchTerm', () => {
    it('escapes %, _, ,, (, ), and \\', () => {
      expect(escapeSearchTerm('a%')).toBe('a\\%');
      expect(escapeSearchTerm('user_name')).toBe('user\\_name');
      expect(escapeSearchTerm('test,foo)bar')).toBe('test\\,foo\\)bar');
      expect(escapeSearchTerm('back\\slash')).toBe('back\\\\slash');
    });
  });

  describe('UsersService unit logic', () => {
    let service: UsersService;
    let mockAccountService: { delete: jest.Mock };
    let mockSupabase: MockSupabaseService;

    beforeEach(() => {
      mockAccountService = { delete: jest.fn().mockResolvedValue(undefined) };
      mockSupabase = {
        client: {
          from: jest.fn(),
          rpc: jest.fn(),
          auth: {
            getClaims: jest.fn(),
            admin: {
              updateUserById: jest
                .fn()
                .mockResolvedValue({ data: {}, error: null }),
              deleteUser: jest
                .fn()
                .mockResolvedValue({ data: {}, error: null }),
            },
          },
          storage: {
            from: jest.fn().mockReturnValue({
              list: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          },
        },
      };

      const mockConfig = {
        get: jest.fn().mockReturnValue('https://dev.supabase.co'),
      };

      service = new UsersService(
        mockSupabase as unknown as SupabaseService,
        mockAccountService as unknown as AccountService,
        mockConfig as unknown as ConfigService,
      );
    });

    it('listUsers applies role, status, q escaping, and pagination', async () => {
      const mockRange = jest.fn().mockResolvedValue({
        data: [
          {
            id: targetId,
            email: 'user@test.devarena',
            username: 'testuser',
            role: 'developer',
            status: 'active',
            created_at: '2026-10-19T00:00:00Z',
          },
        ],
        count: 1,
        error: null,
      });
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
      const mockOr = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEqStatus = jest.fn().mockReturnValue({ or: mockOr });
      const mockEqRole = jest.fn().mockReturnValue({ eq: mockEqStatus });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEqRole });
      mockSupabase.client.from.mockReturnValue({ select: mockSelect });

      const result = await service.listUsers({
        page: 2,
        pageSize: 10,
        role: 'developer',
        status: 'active',
        q: 'test%user,foo)',
      });

      expect(mockSupabase.client.from).toHaveBeenCalledWith('profiles');
      expect(mockEqRole).toHaveBeenCalledWith('role', 'developer');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'active');
      expect(mockOr).toHaveBeenCalledWith(
        'username.ilike.%test\\%user\\,foo\\)%,email.ilike.%test\\%user\\,foo\\)%',
      );
      expect(mockOrder).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(mockRange).toHaveBeenCalledWith(10, 19);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.limit).toBe(10);
    });

    it('setRole forbids changing own role', async () => {
      await expect(
        service.setRole(adminId, adminId, 'developer'),
      ).rejects.toThrow(ConflictException);
    });

    it('setRole prevents demoting the last admin', async () => {
      mockSupabase.client.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Cannot demote the last admin' },
      });

      await expect(
        service.setRole(adminId, targetId, 'developer'),
      ).rejects.toThrow(ConflictException);
    });

    it('setStatus forbids suspending own account', async () => {
      await expect(
        service.setStatus(adminId, adminId, 'suspended', 'Mistake'),
      ).rejects.toThrow(ConflictException);
    });

    it('setStatus requires a non-empty reason', async () => {
      await expect(
        service.setStatus(adminId, targetId, 'suspended', '   '),
      ).rejects.toThrow(BadRequestException);
    });

    it('setStatus suspends target and bans user via auth admin', async () => {
      mockSupabase.client.rpc.mockResolvedValueOnce({
        data: [
          {
            id: targetId,
            email: 'dev@test.devarena',
            username: 'dev_user',
            role: 'developer',
            status: 'suspended',
            created_at: '2026-10-19T00:00:00Z',
          },
        ],
        error: null,
      });

      const res = await service.setStatus(
        adminId,
        targetId,
        'suspended',
        'Violated policy',
      );
      expect(res.status).toBe('suspended');
      expect(
        mockSupabase.client.auth.admin.updateUserById,
      ).toHaveBeenCalledWith(targetId, { ban_duration: '876000h' });
    });

    it('deleteUserByAdmin forbids deleting oneself', async () => {
      await expect(service.deleteUserByAdmin(adminId, adminId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('deleteUserByAdmin prevents deleting the last admin', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: targetId, role: 'admin' },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockSingle });
      const mockCountSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
      });

      mockSupabase.client.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({ eq: mockEq }),
        })
        .mockReturnValueOnce({ select: mockCountSelect });

      await expect(
        service.deleteUserByAdmin(adminId, targetId),
      ).rejects.toThrow(ConflictException);
    });

    it('deleteUserByAdmin calls AccountService.delete on success', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: targetId, role: 'developer' },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockSingle });
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({ eq: mockEq }),
      });

      await service.deleteUserByAdmin(adminId, targetId);
      expect(mockAccountService.delete).toHaveBeenCalledWith(targetId, adminId);
    });
  });

  describe('HTTP Endpoints & Guards Integration', () => {
    let app: INestApplication<Server>;
    let mockSupabase: MockSupabaseService;

    beforeAll(async () => {
      mockSupabase = {
        client: {
          from: jest.fn(),
          rpc: jest.fn(),
          auth: {
            getClaims: jest.fn(),
            admin: {
              updateUserById: jest
                .fn()
                .mockResolvedValue({ data: {}, error: null }),
              deleteUser: jest
                .fn()
                .mockResolvedValue({ data: {}, error: null }),
            },
          },
          storage: {
            from: jest.fn().mockReturnValue({
              list: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          },
        },
      };

      const mockConfig = {
        get: jest.fn((k: string) => {
          if (k === 'DEV_BYPASS_AUTH') return false;
          if (k === 'SUPABASE_URL') return 'https://dev.supabase.co';
          return null;
        }),
      };

      const module = await Test.createTestingModule({
        imports: [AuthModule, UsersModule],
      })
        .overrideProvider(SupabaseService)
        .useValue(mockSupabase)
        .overrideProvider(ConfigService)
        .useValue(mockConfig)
        .compile();

      app = module.createNestApplication<INestApplication<Server>>();
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
      await app?.close();
    });

    it('GET /admin/users returns 401 when token is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .expect(401)
        .expect('Content-Type', /application\/problem\+json/)
        .expect('WWW-Authenticate', 'Bearer');
      const body = res.body as { instance?: string };
      expect(body.instance).toBe('/admin/users');
    });

    it('GET /admin/users returns 403 when user is a developer', async () => {
      mockSupabase.client.auth.getClaims.mockResolvedValueOnce({
        data: { claims: { sub: devId } },
        error: null,
      });
      const mockSingle = jest.fn().mockResolvedValueOnce({
        data: {
          id: devId,
          email: 'dev@test.devarena',
          role: 'developer',
          status: 'active',
        },
        error: null,
      });
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: mockSingle }),
        }),
      });

      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', 'Bearer dev.token')
        .expect(403)
        .expect('Content-Type', /application\/problem\+json/);
    });

    it('GET /admin/users returns 200 list when user is an admin', async () => {
      // 1. Auth check
      mockSupabase.client.auth.getClaims.mockResolvedValueOnce({
        data: { claims: { sub: adminId } },
        error: null,
      });
      const mockAuthSingle = jest.fn().mockResolvedValueOnce({
        data: {
          id: adminId,
          email: 'admin@test.devarena',
          role: 'admin',
          status: 'active',
        },
        error: null,
      });
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: mockAuthSingle }),
        }),
      });

      // 2. Query execution
      const mockRange = jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: adminId,
            email: 'admin@test.devarena',
            username: 'admin_one',
            role: 'admin',
            status: 'active',
            created_at: '2026-10-18T20:00:00Z',
          },
        ],
        count: 1,
        error: null,
      });
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({ order: mockOrder }),
      });

      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', 'Bearer admin.token')
        .expect(200);

      expect(res.body).toEqual({
        items: [
          {
            id: adminId,
            email: 'admin@test.devarena',
            username: 'admin_one',
            role: 'admin',
            status: 'active',
            createdAt: '2026-10-18T20:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        limit: 20,
      });
    });

    it('PATCH /admin/users/:id/role changes role successfully', async () => {
      // Auth
      mockSupabase.client.auth.getClaims.mockResolvedValueOnce({
        data: { claims: { sub: adminId } },
        error: null,
      });
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: {
                id: adminId,
                email: 'admin@test.devarena',
                role: 'admin',
                status: 'active',
              },
              error: null,
            }),
          }),
        }),
      });

      // RPC call
      mockSupabase.client.rpc.mockResolvedValueOnce({
        data: [
          {
            id: targetId,
            email: 'user@test.devarena',
            username: 'user_target',
            role: 'recruiter',
            status: 'active',
            created_at: '2026-10-18T21:00:00Z',
          },
        ],
        error: null,
      });

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${targetId}/role`)
        .set('Authorization', 'Bearer admin.token')
        .send({ role: 'recruiter' })
        .expect(200);

      const body = res.body as { role?: string };
      expect(body.role).toBe('recruiter');
    });

    it('PATCH /admin/users/:id/status suspends user with reason', async () => {
      // Auth
      mockSupabase.client.auth.getClaims.mockResolvedValueOnce({
        data: { claims: { sub: adminId } },
        error: null,
      });
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: {
                id: adminId,
                email: 'admin@test.devarena',
                role: 'admin',
                status: 'active',
              },
              error: null,
            }),
          }),
        }),
      });

      // RPC call
      mockSupabase.client.rpc.mockResolvedValueOnce({
        data: [
          {
            id: targetId,
            email: 'user@test.devarena',
            username: 'user_target',
            role: 'developer',
            status: 'suspended',
            created_at: '2026-10-18T21:00:00Z',
          },
        ],
        error: null,
      });

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${targetId}/status`)
        .set('Authorization', 'Bearer admin.token')
        .send({ status: 'suspended', reason: 'Spam activity' })
        .expect(200);

      const body = res.body as { status?: string };
      expect(body.status).toBe('suspended');
    });

    it('PATCH /admin/users/:id/role changes role with new_role DTO property', async () => {
      mockSupabase.client.auth.getClaims.mockResolvedValueOnce({
        data: { claims: { sub: adminId } },
        error: null,
      });
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: {
                id: adminId,
                email: 'admin@test.devarena',
                role: 'admin',
                status: 'active',
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.client.rpc.mockResolvedValueOnce({
        data: [
          {
            id: targetId,
            email: 'user@test.devarena',
            username: 'user_target',
            role: 'admin',
            status: 'active',
            created_at: '2026-10-18T21:00:00Z',
          },
        ],
        error: null,
      });

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${targetId}/role`)
        .set('Authorization', 'Bearer admin.token')
        .send({ new_role: 'admin' })
        .expect(200);

      const body = res.body as { role?: string };
      expect(body.role).toBe('admin');
    });

    it('PATCH /admin/users/:id/status updates status with new_status DTO property', async () => {
      mockSupabase.client.auth.getClaims.mockResolvedValueOnce({
        data: { claims: { sub: adminId } },
        error: null,
      });
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: {
                id: adminId,
                email: 'admin@test.devarena',
                role: 'admin',
                status: 'active',
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.client.rpc.mockResolvedValueOnce({
        data: [
          {
            id: targetId,
            email: 'user@test.devarena',
            username: 'user_target',
            role: 'developer',
            status: 'active',
            created_at: '2026-10-18T21:00:00Z',
          },
        ],
        error: null,
      });

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${targetId}/status`)
        .set('Authorization', 'Bearer admin.token')
        .send({ new_status: 'active' })
        .expect(200);

      const body = res.body as { status?: string };
      expect(body.status).toBe('active');
    });

    it('DELETE /admin/users/:id returns 204 on success', async () => {
      // Auth
      mockSupabase.client.auth.getClaims.mockResolvedValueOnce({
        data: { claims: { sub: adminId } },
        error: null,
      });
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: {
                id: adminId,
                email: 'admin@test.devarena',
                role: 'admin',
                status: 'active',
              },
              error: null,
            }),
          }),
        }),
      });

      // Profile lookup for target
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: { id: targetId, role: 'developer' },
              error: null,
            }),
          }),
        }),
      });

      // audit_log insert
      mockSupabase.client.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValueOnce({ error: null }),
      });

      await request(app.getHttpServer())
        .delete(`/admin/users/${targetId}`)
        .set('Authorization', 'Bearer admin.token')
        .expect(204);
    });

    it('DELETE /admin/users/:id returns 409 when admin tries to delete themselves', async () => {
      // Auth
      mockSupabase.client.auth.getClaims.mockResolvedValueOnce({
        data: { claims: { sub: adminId } },
        error: null,
      });
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: {
                id: adminId,
                email: 'admin@test.devarena',
                role: 'admin',
                status: 'active',
              },
              error: null,
            }),
          }),
        }),
      });

      await request(app.getHttpServer())
        .delete(`/admin/users/${adminId}`)
        .set('Authorization', 'Bearer admin.token')
        .expect(409);
    });
  });
});
