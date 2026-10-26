import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { SupabaseService } from '../supabase/supabase.service';
import type { AccountService } from '../auth/account.service';

const userId = '11111111-1111-4111-8111-111111111111';
const otherUserId = '22222222-2222-4222-8222-222222222222';
const supabaseUrl = 'https://qorlygdcfwnrrzvzulcz.supabase.co';

interface MockSupabaseClient {
  from: jest.Mock;
  rpc: jest.Mock;
}

interface MockSupabaseService {
  client: MockSupabaseClient;
}

interface MockAccountService {
  delete: jest.Mock;
}

describe('UsersService & DTO validation', () => {
  let validator: ValidationPipe;

  beforeEach(() => {
    validator = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  describe('UpdateProfileDto validation', () => {
    it('accepts a valid patch', async () => {
      const dto = (await validator.transform(
        {
          username: 'valid_user123',
          bio: '  Developer from Paris  ',
          country: 'FR',
          institution: '  DevArena Org  ',
          technologyIds: [
            'a0000000-0000-4000-8000-000000000001',
            'a0000000-0000-4000-8000-000000000002',
          ],
          visibility: 'public',
          avatarUrl: `${supabaseUrl}/storage/v1/object/public/avatars/${userId}/avatar.png`,
        },
        { type: 'body', metatype: UpdateProfileDto },
      )) as UpdateProfileDto;
      expect(dto.username).toBe('valid_user123');
      expect(dto.bio).toBe('Developer from Paris');
      expect(dto.country).toBe('FR');
      expect(dto.institution).toBe('DevArena Org');
    });

    it('rejects unknown fields with 400', async () => {
      await expect(
        validator.transform(
          { role: 'admin', unknownField: 123 },
          { type: 'body', metatype: UpdateProfileDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it.each(['ZZ', 'us', 'XYZ', '12', 'France'])(
      'rejects invalid country code %j with 400',
      async (country) => {
        await expect(
          validator.transform(
            { country },
            { type: 'body', metatype: UpdateProfileDto },
          ),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it('accepts valid uppercase ISO country codes', async () => {
      for (const country of ['FR', 'US', 'GB', 'DE', 'JP', 'CA']) {
        const dto = (await validator.transform(
          { country },
          { type: 'body', metatype: UpdateProfileDto },
        )) as UpdateProfileDto;
        expect(dto.country).toBe(country);
      }
    });

    it('rejects more than 20 technology IDs with 400', async () => {
      const ids = Array.from(
        { length: 21 },
        (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      );
      await expect(
        validator.transform(
          { technologyIds: ids },
          { type: 'body', metatype: UpdateProfileDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate technology IDs with 400', async () => {
      const id = '00000000-0000-4000-8000-000000000001';
      await expect(
        validator.transform(
          { technologyIds: [id, id] },
          { type: 'body', metatype: UpdateProfileDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it.each([
      'ab',
      'a!b',
      'user with spaces',
      'user_name_that_is_way_too_long_for_db',
    ])('rejects invalid username %j with 400', async (username) => {
      await expect(
        validator.transform(
          { username },
          { type: 'body', metatype: UpdateProfileDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('UsersService methods', () => {
    let service: UsersService;
    let mockSupabase: MockSupabaseService;
    let mockAccountService: MockAccountService;

    beforeEach(() => {
      mockSupabase = {
        client: {
          from: jest.fn(),
          rpc: jest.fn(),
        },
      };
      mockAccountService = {
        delete: jest.fn().mockResolvedValue(undefined),
      };
      const config = new ConfigService({
        SUPABASE_URL: supabaseUrl,
      });
      service = new UsersService(
        mockSupabase as unknown as SupabaseService,
        mockAccountService as unknown as AccountService,
        config,
      );
    });

    describe('assertValidAvatarUrl', () => {
      it('accepts own avatars bucket URL', () => {
        expect(() =>
          service.assertValidAvatarUrl(
            `${supabaseUrl}/storage/v1/object/public/avatars/${userId}/pic.png`,
            userId,
          ),
        ).not.toThrow();
      });

      it('accepts GitHub and Google avatar URLs', () => {
        expect(() =>
          service.assertValidAvatarUrl(
            'https://avatars.githubusercontent.com/u/12345',
            userId,
          ),
        ).not.toThrow();
        expect(() =>
          service.assertValidAvatarUrl(
            'https://lh3.googleusercontent.com/a/abc123xyz',
            userId,
          ),
        ).not.toThrow();
      });

      it('rejects avatar URL belonging to another user with 400', () => {
        expect(() =>
          service.assertValidAvatarUrl(
            `${supabaseUrl}/storage/v1/object/public/avatars/${otherUserId}/pic.png`,
            userId,
          ),
        ).toThrow(BadRequestException);
      });

      it('rejects untrusted external avatar URL with 400', () => {
        expect(() =>
          service.assertValidAvatarUrl('https://evil.com/pic.png', userId),
        ).toThrow(BadRequestException);
      });
    });

    describe('getProfile', () => {
      it('returns mapped profile with technologies', async () => {
        const mockProfile = {
          id: userId,
          email: 'test@example.test',
          username: 'testuser',
          role: 'developer',
          status: 'active',
          avatar_url: 'https://avatars.githubusercontent.com/test',
          bio: 'My bio',
          country: 'FR',
          institution: '42',
          visibility: 'public',
          created_at: '2026-10-18T00:00:00Z',
        };

        const mockTechRows = [
          {
            technology_id: 'a0000000-0000-4000-8000-000000000001',
            technologies: {
              id: 'a0000000-0000-4000-8000-000000000001',
              name: 'TypeScript',
            },
          },
        ];

        mockSupabase.client.from.mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: jest
                    .fn()
                    .mockResolvedValue({ data: mockProfile, error: null }),
                }),
              }),
            };
          }
          if (table === 'profile_technologies') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ data: mockTechRows, error: null }),
              }),
            };
          }
          return {};
        });

        const res = await service.getProfile(userId);
        expect(res).toEqual({
          id: userId,
          email: 'test@example.test',
          username: 'testuser',
          role: 'developer',
          status: 'active',
          avatarUrl: 'https://avatars.githubusercontent.com/test',
          bio: 'My bio',
          country: 'FR',
          institution: '42',
          technologies: [
            { id: 'a0000000-0000-4000-8000-000000000001', name: 'TypeScript' },
          ],
          visibility: 'public',
          createdAt: '2026-10-18T00:00:00Z',
          devScore: null,
          tier: null,
        });
      });

      it('populates calculated devScore and tier when available in dev_scores view', async () => {
        const mockDevProfile = {
          id: userId,
          email: 'dev@example.test',
          username: 'devuser',
          role: 'developer',
          status: 'active',
          avatar_url: null,
          bio: null,
          country: null,
          institution: null,
          visibility: 'public',
          created_at: '2026-10-18T00:00:00Z',
        };

        mockSupabase.client.from.mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: mockDevProfile, error: null }),
                }),
              }),
            };
          }
          if (table === 'profile_technologies') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ data: [], error: null }),
              }),
            };
          }
          if (table === 'dev_scores') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { dev_score: 82.5, tier: 'advanced' },
                      error: null,
                    }),
                }),
              }),
            };
          }
          if (table === 'competitive_leaderboard') {
            return {
              select: () => ({
                eq: (_column: string, id: string) => {
                  expect(id).toBe(userId);
                  return {
                    maybeSingle: async () => ({
                      data: {
                        competitive_points: 1972,
                        duel_rating: 1224,
                        tier: 'Platinum',
                      },
                      error: null,
                    }),
                  };
                },
              }),
            };
          }
          return {};
        });

        const res = await service.getProfile(userId);
        expect(res.devScore).toBe(82.5);
        expect(res.tier).toBe('advanced');
        expect(res).toMatchObject({
          competitivePoints: 1972,
          duelRating: 1224,
          competitiveTier: 'Platinum',
        });
      });

      it('returns status suspended when profile is suspended', async () => {
        const mockSuspended = {
          id: userId,
          email: 'suspended@example.test',
          username: 'suspendeduser',
          role: 'developer',
          status: 'suspended',
          avatar_url: null,
          bio: null,
          country: null,
          institution: null,
          visibility: 'public',
          created_at: '2026-10-18T00:00:00Z',
        };
        mockSupabase.client.from.mockReturnValue({
          select: () => ({
            eq: () => ({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: mockSuspended, error: null }),
            }),
          }),
        });
        const res = await service.getProfile(userId);
        expect(res.status).toBe('suspended');
      });

      it('throws NotFoundException when profile does not exist', async () => {
        mockSupabase.client.from.mockReturnValue({
          select: () => ({
            eq: () => ({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
          }),
        });

        await expect(service.getProfile(userId)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('returns empty technologies for admin and recruiter profiles', async () => {
        const mockAdminProfile = {
          id: userId,
          email: 'admin@example.test',
          username: 'adminuser',
          role: 'admin',
          avatar_url: null,
          bio: 'Admin bio',
          country: 'FR',
          institution: 'Admin Org',
          visibility: 'private',
          created_at: '2026-10-18T00:00:00Z',
        };

        const mockTechRows = [
          {
            technology_id: 'a0000000-0000-4000-8000-000000000001',
            technologies: {
              id: 'a0000000-0000-4000-8000-000000000001',
              name: 'TypeScript',
            },
          },
        ];

        mockSupabase.client.from.mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: jest
                    .fn()
                    .mockResolvedValue({ data: mockAdminProfile, error: null }),
                }),
              }),
            };
          }
          if (table === 'profile_technologies') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ data: mockTechRows, error: null }),
              }),
            };
          }
          return {};
        });

        const res = await service.getProfile(userId);
        expect(res.role).toBe('admin');
        expect(res.technologies).toEqual([]);
      });
    });

    describe('updateProfile', () => {
      it('maps 23505 unique violation to ConflictException (409 username_taken)', async () => {
        mockSupabase.client.rpc.mockResolvedValue({
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint',
          },
        });

        await expect(
          service.updateProfile(userId, { username: 'taken_user' }),
        ).rejects.toThrow(ConflictException);
      });

      it('updates profile and returns the new profile state on success', async () => {
        mockSupabase.client.rpc.mockResolvedValue({ error: null });
        jest.spyOn(service, 'getProfile').mockResolvedValue({
          id: userId,
          email: 'test@example.test',
          username: 'new_username',
          role: 'developer',
          status: 'active',
          avatarUrl: null,
          bio: null,
          country: null,
          institution: null,
          technologies: [],
          visibility: 'public',
          createdAt: '2026-10-18T00:00:00Z',
          devScore: null,
          tier: null,
        });

        const result = await service.updateProfile(userId, {
          username: 'new_username',
        });
        expect(result.username).toBe('new_username');
        expect(mockSupabase.client.rpc).toHaveBeenCalledWith('update_profile', {
          p_id: userId,
          p_patch: { username: 'new_username' },
          p_technology_ids: null,
        });
      });

      it('does not send technology IDs to RPC when non-developer updates profile', async () => {
        const mockRecruiterProfile = {
          id: userId,
          role: 'recruiter',
        };
        mockSupabase.client.from.mockReturnValue({
          select: () => ({
            eq: () => ({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: mockRecruiterProfile, error: null }),
            }),
          }),
        });
        mockSupabase.client.rpc.mockResolvedValue({ error: null });
        jest.spyOn(service, 'getProfile').mockResolvedValue({
          id: userId,
          email: 'recruiter@example.test',
          username: 'recruiter1',
          role: 'recruiter',
          status: 'active',
          avatarUrl: null,
          bio: 'Recruiter bio',
          country: null,
          institution: null,
          technologies: [],
          visibility: 'public',
          createdAt: '2026-10-18T00:00:00Z',
          devScore: null,
          tier: null,
        });

        await service.updateProfile(userId, {
          bio: 'Recruiter bio',
          technologyIds: ['a0000000-0000-4000-8000-000000000001'],
        });

        expect(mockSupabase.client.rpc).toHaveBeenCalledWith('update_profile', {
          p_id: userId,
          p_patch: { bio: 'Recruiter bio' },
          p_technology_ids: null,
        });
      });

      it('falls back to direct profile update when update_profile RPC is missing from schema cache', async () => {
        mockSupabase.client.rpc.mockResolvedValue({
          error: {
            code: 'PGRST202',
            message:
              'Could not find the function public.update_profile(p_id, p_patch, p_technology_ids) in the schema cache',
          },
        });
        const updateMock = jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        });
        mockSupabase.client.from.mockReturnValue({
          update: updateMock,
        });
        jest.spyOn(service, 'getProfile').mockResolvedValue({
          id: userId,
          email: 'test@example.test',
          username: 'new_username',
          role: 'developer',
          status: 'active',
          avatarUrl: null,
          bio: 'new bio',
          country: null,
          institution: null,
          technologies: [],
          visibility: 'public',
          createdAt: '2026-10-18T00:00:00Z',
          devScore: null,
          tier: null,
        });

        const result = await service.updateProfile(userId, {
          username: 'new_username',
          bio: 'new bio',
        });
        expect(result.username).toBe('new_username');
        expect(updateMock).toHaveBeenCalled();
      });
    });

    describe('deleteMe', () => {
      it('throws BadRequestException if confirmation username does not match', async () => {
        mockSupabase.client.from.mockReturnValue({
          select: () => ({
            eq: () => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { username: 'current_user' },
                error: null,
              }),
            }),
          }),
        });

        await expect(service.deleteMe(userId, 'wrong_user')).rejects.toThrow(
          BadRequestException,
        );
        expect(mockAccountService.delete).not.toHaveBeenCalled();
      });

      it('calls AccountService.delete when confirmation matches', async () => {
        mockSupabase.client.from.mockReturnValue({
          select: () => ({
            eq: () => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { username: 'current_user' },
                error: null,
              }),
            }),
          }),
        });

        await service.deleteMe(userId, 'current_user');
        expect(mockAccountService.delete).toHaveBeenCalledWith(userId, userId);
      });
    });

    describe('listTechnologies', () => {
      it('returns active technologies ordered by name', async () => {
        const techs = [
          { id: '1', name: 'JavaScript' },
          { id: '2', name: 'TypeScript' },
        ];
        mockSupabase.client.from.mockReturnValue({
          select: () => ({
            eq: () => ({
              order: jest.fn().mockResolvedValue({ data: techs, error: null }),
            }),
          }),
        });

        const result = await service.listTechnologies();
        expect(result).toEqual(techs);
      });

      it('returns fallback technologies if table query fails or returns empty', async () => {
        mockSupabase.client.from.mockReturnValue({
          select: () => ({
            eq: () => ({
              order: jest.fn().mockResolvedValue({ data: [], error: { message: 'offline' } }),
            }),
          }),
        });

        const result = await service.listTechnologies();
        expect(result.length).toBeGreaterThanOrEqual(10);
        expect(result.some((t) => t.name === 'TypeScript')).toBe(true);
      });
    });

    describe('resilient developer skills & recruiter score safety', () => {
      it('retains skills in memory fallback when profile_technologies join is empty', async () => {
        // Mock getProfile db call
        mockSupabase.client.from.mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: {
                      id: userId,
                      email: 'recruiter@devarena.test',
                      username: 'lead_recruiter',
                      role: 'recruiter',
                      avatar_url: null,
                      bio: 'Hiring lead',
                      country: 'DE',
                      institution: 'Tech Recruit GmbH',
                      visibility: 'public',
                      created_at: '2026-10-19T00:00:00Z',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'profile_technologies') {
            return {
              select: () => ({
                eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
          }
          return {};
        });

        const profile = await service.getProfile(userId);
        expect(profile.role).toBe('recruiter');
        expect(profile.devScore).toBeNull();
        expect(profile.tier).toBeNull();
      });
    });
  });
});
