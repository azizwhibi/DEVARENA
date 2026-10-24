import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { SupabaseService as IdentityDatabase } from '../supabase/supabase.service';
import { SupabaseService as SkillsDatabase } from './skills-database.service';
import { SkillProgressService } from './skill-progress.service';
import { SkillsService } from './skills.service';
import { CatalogService } from './catalog.service';
import { UsersService } from '../users/users.service';

describe('Aziz authentication with Syrine skills', () => {
  let app: INestApplication;
  const developerId = '00000000-0000-4000-8000-000000000001';
  const adminId = '00000000-0000-4000-8000-000000000002';
  const skillId = '00000000-0000-4000-8000-000000000003';
  const skills = {
    meta: jest.fn().mockResolvedValue({ categories: [], technologies: [] }),
    create: jest.fn().mockResolvedValue({ id: skillId }),
    update: jest.fn().mockResolvedValue({ id: skillId }),
  };
  const progress = {
    getUserProgressWithDelta: jest.fn().mockResolvedValue([]),
    getUserHistory: jest.fn().mockResolvedValue([]),
  };
  const users = {
    listTechnologies: jest
      .fn()
      .mockResolvedValue([{ id: 'existing', name: 'React' }]),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthService)
      .useValue({
        authenticate: jest.fn((header?: string) => {
          if (header !== 'Bearer developer' && header !== 'Bearer admin')
            throw new UnauthorizedException();
          return {
            id: header === 'Bearer admin' ? adminId : developerId,
            role: header === 'Bearer admin' ? 'admin' : 'developer',
            status: 'active',
            email: 'test@example.invalid',
          };
        }),
      })
      .overrideProvider(IdentityDatabase)
      .useValue({ client: {} })
      .overrideProvider(SkillsDatabase)
      .useValue({ client: {} })
      .overrideProvider(SkillsService)
      .useValue(skills)
      .overrideProvider(SkillProgressService)
      .useValue(progress)
      .overrideProvider(CatalogService)
      .useValue({ list: jest.fn().mockResolvedValue({ items: [], total: 0 }) })
      .overrideProvider(UsersService)
      .useValue(users)
      .compile();
    app = module.createNestApplication();
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

  it('requires authentication on all skill screens’ APIs', async () => {
    for (const endpoint of [
      '/skills',
      '/me/skills',
      '/admin/skills/meta',
      '/admin/skill-challenges',
    ]) {
      await request(app.getHttpServer()).get(endpoint).expect(401);
    }
  });
  it('uses the authenticated developer for progress and history', async () => {
    await request(app.getHttpServer())
      .get('/me/skills')
      .set('Authorization', 'Bearer developer')
      .expect(200, []);
    await request(app.getHttpServer())
      .get(`/me/skills/${skillId}/history`)
      .set('Authorization', 'Bearer developer')
      .expect(200, []);
    expect(progress.getUserProgressWithDelta).toHaveBeenCalledWith(developerId);
    expect(progress.getUserHistory).toHaveBeenCalledWith(developerId, skillId);
  });
  it('blocks developer access to skill administration and simulations', async () => {
    await request(app.getHttpServer())
      .get('/admin/skills/meta')
      .set('Authorization', 'Bearer developer')
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/skill-challenges')
      .set('Authorization', 'Bearer developer')
      .expect(403);
    await request(app.getHttpServer())
      .post(
        `/admin/progress/users/${developerId}/challenges/${skillId}/attempt`,
      )
      .set('Authorization', 'Bearer developer')
      .send({ isSuccess: true })
      .expect(403);
  });
  it('allows administrators and records the signed-in actor', async () => {
    await request(app.getHttpServer())
      .get('/admin/skills/meta')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    await request(app.getHttpServer())
      .post('/admin/skills')
      .set('Authorization', 'Bearer admin')
      .send({ name: 'New skill', categoryId: skillId })
      .expect(201);
    expect(skills.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New skill' }),
      adminId,
    );
  });
  it('restricts skill editing to administrators and records the signed-in actor', async () => {
    const payload = { name: 'Updated skill', categoryId: skillId, technologyId: null, description: '' };
    await request(app.getHttpServer()).patch(`/admin/skills/${skillId}`).send(payload).expect(401);
    await request(app.getHttpServer()).patch(`/admin/skills/${skillId}`).set('Authorization', 'Bearer developer').send(payload).expect(403);
    expect(skills.update).not.toHaveBeenCalled();
    await request(app.getHttpServer()).patch(`/admin/skills/${skillId}`).set('Authorization', 'Bearer admin').send(payload).expect(200);
    expect(skills.update).toHaveBeenCalledWith(skillId, expect.objectContaining(payload), adminId);
  });
  it('rejects malformed skill IDs and unknown catalog parameters', async () => {
    await request(app.getHttpServer())
      .get('/me/skills/not-a-uuid/history')
      .set('Authorization', 'Bearer developer')
      .expect(400);
    await request(app.getHttpServer())
      .get('/skills?userId=someone-else')
      .set('Authorization', 'Bearer developer')
      .expect(400);
  });
  it('keeps Aziz’s existing user endpoint and technologies route', async () => {
    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer developer')
      .expect(200)
      .expect((response) => {
        expect(response.body.id).toBe(developerId);
        expect(response.body.role).toBe('developer');
      });
    await request(app.getHttpServer())
      .get('/technologies')
      .expect(200, [{ id: 'existing', name: 'React' }]);
    expect(users.listTechnologies).toHaveBeenCalled();
  });
});
