import { INestApplication, ValidationPipe } from '@nestjs/common';
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

describe('Recruiter Candidates Hub (Live Database Candidates)', () => {
  const recruiterId = '11111111-1111-4111-8111-111111111111';
  const adminId = '22222222-2222-4222-8222-222222222222';
  const devId = '33333333-3333-4333-8333-333333333333';
  const candidateId = '44444444-4444-4444-8444-444444444444';

  describe('UsersService.listCandidates unit logic', () => {
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

    it('queries active developers and strips private PII like email', async () => {
      const mockRange = jest.fn().mockResolvedValue({
        data: [
          {
            id: candidateId,
            email: 'secret_dev@test.devarena', // Should be omitted from candidate items
            username: 'alice_dev',
            avatar_url: 'https://dev.supabase.co/avatar.png',
            bio: 'Distributed systems engineer',
            country: 'DE',
            institution: 'TU Munich',
            created_at: '2026-10-19T10:00:00Z',
          },
        ],
        count: 1,
        error: null,
      });

      const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
      const mockEqStatus = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEqRole = jest.fn().mockReturnValue({ eq: mockEqStatus });
      const mockSelectProfiles = jest.fn().mockReturnValue({ eq: mockEqRole });

      // Profile technologies query
      const mockIn = jest.fn().mockResolvedValue({
        data: [
          {
            profile_id: candidateId,
            technologies: { id: 't1', name: 'Rust' },
          },
          {
            profile_id: candidateId,
            technologies: { id: 't2', name: 'Go' },
          },
        ],
        error: null,
      });
      const mockSelectTech = jest.fn().mockReturnValue({ in: mockIn });

      mockSupabase.client.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return { select: mockSelectProfiles };
        }
        if (table === 'profile_technologies') {
          return { select: mockSelectTech };
        }
        return { select: jest.fn() };
      });

      const result = await service.listCandidates({
        page: 1,
        pageSize: 10,
      });

      expect(mockSupabase.client.from).toHaveBeenCalledWith('profiles');
      expect(mockEqRole).toHaveBeenCalledWith('role', 'developer');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'active');
      expect(mockOrder).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(mockRange).toHaveBeenCalledWith(0, 9);

      expect(result.items).toHaveLength(1);
      const candidate = result.items[0];
      expect(candidate.id).toBe(candidateId);
      expect(candidate.username).toBe('alice_dev');
      expect(candidate.skills).toEqual(['Rust', 'Go']);
      expect(candidate.country).toBe('DE');
      expect(candidate.institution).toBe('TU Munich');
      expect(candidate.bio).toBe('Distributed systems engineer');
      expect(candidate.devScore).toBeGreaterThanOrEqual(1000);
      expect(['Diamond', 'Platinum', 'Gold', 'Silver']).toContain(
        candidate.tier,
      );
      expect(candidate.availability).toBe('Open to offers');

      // Zero Raw PII assertion: email must be undefined
      expect((candidate as Record<string, unknown>).email).toBeUndefined();
    });

    it('filters by search term q and country', async () => {
      const mockRange = jest.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
      const mockOr = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEqCountry = jest.fn().mockReturnValue({ or: mockOr });
      const mockEqStatus = jest.fn().mockReturnValue({ eq: mockEqCountry });
      const mockEqRole = jest.fn().mockReturnValue({ eq: mockEqStatus });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEqRole });

      mockSupabase.client.from.mockReturnValue({ select: mockSelect });

      await service.listCandidates({
        page: 1,
        pageSize: 20,
        q: 'Stanford,CA)test',
        country: 'US',
      });

      expect(mockEqCountry).toHaveBeenCalledWith('country', 'US');
      expect(mockOr).toHaveBeenCalledWith(
        'username.ilike.%Stanford\\,CA\\)test%,bio.ilike.%Stanford\\,CA\\)test%,institution.ilike.%Stanford\\,CA\\)test%',
      );
    });
  });

  describe('Recruiter Candidates HTTP Controller & Guard', () => {
    let app: INestApplication;
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

      const moduleRef = await Test.createTestingModule({
        imports: [AuthModule, UsersModule],
      })
        .overrideProvider(SupabaseService)
        .useValue(mockSupabase)
        .overrideProvider(ConfigService)
        .useValue({
          get: jest.fn((k: string) => {
            if (k === 'SUPABASE_URL') return 'https://dev.supabase.co';
            if (k === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-key';
            return null;
          }),
        })
        .compile();

      app = moduleRef.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      app.useGlobalFilters(new ProblemDetailsFilter());
      await app.init();
    });

    afterAll(async () => {
      await app?.close();
    });

    it('GET /recruiter/candidates returns 401 when token is missing', async () => {
      const res = await request(app.getHttpServer() as Server)
        .get('/recruiter/candidates')
        .expect(401)
        .expect('Content-Type', /application\/problem\+json/)
        .expect('WWW-Authenticate', 'Bearer');
      const body = res.body as { instance?: string };
      expect(body.instance).toBe('/recruiter/candidates');
    });

    it('GET /recruiter/candidates returns 403 when user is a developer', async () => {
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

      await request(app.getHttpServer() as Server)
        .get('/recruiter/candidates')
        .set('Authorization', 'Bearer dev.token')
        .expect(403)
        .expect('Content-Type', /application\/problem\+json/);
    });

    it('GET /recruiter/candidates returns 200 list when user is a recruiter', async () => {
      // 1. Auth check
      mockSupabase.client.auth.getClaims.mockResolvedValueOnce({
        data: { claims: { sub: recruiterId } },
        error: null,
      });
      const mockAuthSingle = jest.fn().mockResolvedValueOnce({
        data: {
          id: recruiterId,
          email: 'recruiter@test.devarena',
          role: 'recruiter',
          status: 'active',
        },
        error: null,
      });
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: mockAuthSingle }),
        }),
      });

      // 2. Candidates query
      const mockRange = jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: candidateId,
            username: 'candidate_one',
            avatar_url: null,
            bio: 'Fullstack developer',
            country: 'FR',
            institution: '42 Paris',
            created_at: '2026-10-19T00:00:00Z',
          },
        ],
        count: 1,
        error: null,
      });
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
      const mockEqStatus = jest.fn().mockReturnValue({ order: mockOrder });
      const mockEqRole = jest.fn().mockReturnValue({ eq: mockEqStatus });
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({ eq: mockEqRole }),
      });

      // 3. Technologies query
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValueOnce({
            data: [
              {
                profile_id: candidateId,
                technologies: { id: 't1', name: 'TypeScript' },
              },
            ],
            error: null,
          }),
        }),
      });

      const res = await request(app.getHttpServer() as Server)
        .get('/recruiter/candidates?page=1&pageSize=10')
        .set('Authorization', 'Bearer recruiter.token')
        .expect(200);

      const body = res.body as {
        items: Record<string, unknown>[];
        total: number;
      };
      expect(body.total).toBe(1);
      expect(body.items).toHaveLength(1);
      expect(body.items[0].username).toBe('candidate_one');
      expect(body.items[0].skills).toEqual(['TypeScript']);
      expect(body.items[0].country).toBe('FR');
      expect(body.items[0].email).toBeUndefined(); // Zero PII leak
    });

    it('GET /recruiter/candidates returns 200 list when user is an admin', async () => {
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

      // 2. Candidates query
      const mockRange = jest.fn().mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({ range: mockRange }),
            }),
          }),
        }),
      });

      const res = await request(app.getHttpServer() as Server)
        .get('/recruiter/candidates')
        .set('Authorization', 'Bearer admin.token')
        .expect(200);

      const body = res.body as { items: unknown[]; total: number };
      expect(body.total).toBe(0);
      expect(body.items).toEqual([]);
    });
  });
});
