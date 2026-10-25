import type { Server } from 'node:net';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthService } from '../auth/auth.service';
import { AdminGuard, UserGuard } from '../auth/guards';
import {
  AssignmentsController,
  MyAssignmentsController,
  DemonstratedSkillsController,
} from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { TechnologiesController } from './technologies.controller';
import { TechnologiesService } from './technologies.service';
import { SkillProgressService } from './skill-progress.service';
import { SupabaseService } from './skills-database.service';
import {
  ProblemsController,
  ProblemsAdminController,
} from './problems.controller';
import { ProblemsService } from './problems.service';

describe('Skills management boundaries', () => {
  const user = '00000000-0000-4000-8000-000000000001',
    skill = '00000000-0000-4000-8000-000000000002';
  let app: INestApplication<Server>;
  const assignments = {
    list: jest.fn().mockResolvedValue([]),
    assign: jest.fn().mockResolvedValue([]),
    demonstrated: jest.fn().mockResolvedValue([]),
  };
  const problems = {
    topics: jest.fn().mockResolvedValue([]),
    list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    save: jest.fn().mockResolvedValue({}),
    links: jest.fn().mockResolvedValue({ saved: true }),
  };
  const skills = {
    create: jest.fn().mockResolvedValue({ id: skill }),
    setActive: jest.fn().mockResolvedValue({ id: skill, is_active: false }),
  };
  const technologies = {
    create: jest.fn().mockResolvedValue({ id: skill }),
    setActive: jest.fn().mockResolvedValue({ id: skill, is_active: false }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        ProblemsController,
        ProblemsAdminController,
        AssignmentsController,
        MyAssignmentsController,
        DemonstratedSkillsController,
        SkillsController,
        TechnologiesController,
      ],
      providers: [
        { provide: ProblemsService, useValue: problems },
        AdminGuard,
        UserGuard,
        {
          provide: AuthService,
          useValue: {
            authenticate: (header: string) => {
              if (!['Bearer admin', 'Bearer developer'].includes(header))
                throw new UnauthorizedException();
              return {
                id: user,
                role: header === 'Bearer admin' ? 'admin' : 'developer',
              };
            },
          },
        },
        { provide: AssignmentsService, useValue: assignments },
        { provide: SkillsService, useValue: skills },
        { provide: TechnologiesService, useValue: technologies },
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
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('protects assignments from anonymous and developer mutations', async () => {
    await request(app.getHttpServer())
      .post(`/admin/developers/${user}/skills/${skill}`)
      .expect(401);
    await request(app.getHttpServer())
      .post(`/admin/developers/${user}/skills/${skill}`)
      .set('Authorization', 'Bearer developer')
      .expect(403);
    expect(assignments.assign).not.toHaveBeenCalled();
  });
  it('discovers skills for the authenticated developer and protects other profiles', async () => {
    await request(app.getHttpServer())
      .get('/me/skills/demonstrated')
      .expect(401);
    await request(app.getHttpServer())
      .get('/me/skills/demonstrated?userId=someone-else')
      .set('Authorization', 'Bearer developer')
      .expect(200, []);
    expect(assignments.demonstrated).toHaveBeenLastCalledWith(user);
    await request(app.getHttpServer())
      .get(`/admin/developers/${user}/demonstrated-skills`)
      .set('Authorization', 'Bearer developer')
      .expect(403);
    await request(app.getHttpServer())
      .get(`/admin/developers/${skill}/demonstrated-skills`)
      .set('Authorization', 'Bearer admin')
      .expect(200, []);
    expect(assignments.demonstrated).toHaveBeenLastCalledWith(skill);
    await request(app.getHttpServer())
      .get('/admin/developers/invalid/demonstrated-skills')
      .set('Authorization', 'Bearer admin')
      .expect(400);
    await request(app.getHttpServer())
      .post('/me/skills/demonstrated')
      .set('Authorization', 'Bearer developer')
      .send({ skillId: skill, levelScore: 100 })
      .expect(404);
  });
  it('protects problem administration and rejects invalid topic payloads', async () => {
    await request(app.getHttpServer()).get('/problems').expect(401);
    await request(app.getHttpServer())
      .post('/admin/problems/topics')
      .set('Authorization', 'Bearer developer')
      .send({ name: 'Array', slug: 'array', is_active: true })
      .expect(403);
    for (const body of [
      { name: ' ', slug: 'array', is_active: true },
      { name: 'Array', slug: 'Bad Slug', is_active: true },
    ])
      await request(app.getHttpServer())
        .post('/admin/problems/topics')
        .set('Authorization', 'Bearer admin')
        .send(body)
        .expect(400);
    await request(app.getHttpServer())
      .put(`/admin/problems/${skill}/topics`)
      .set('Authorization', 'Bearer admin')
      .send({ topicIds: [skill, skill] })
      .expect(400);
    expect(problems.save).not.toHaveBeenCalled();
    expect(problems.links).not.toHaveBeenCalled();
  });
  it('uses the authenticated actor for topic replacement and bounds catalogue pagination', async () => {
    await request(app.getHttpServer())
      .put(`/admin/problems/${skill}/topics`)
      .set('Authorization', 'Bearer admin')
      .send({ topicIds: [] })
      .expect(200);
    expect(problems.links).toHaveBeenCalledWith(user, skill, []);
    await request(app.getHttpServer())
      .get('/problems?pageSize=999')
      .set('Authorization', 'Bearer developer')
      .expect(400);
    await request(app.getHttpServer())
      .get('/problems?topic=invalid')
      .set('Authorization', 'Bearer developer')
      .expect(400);
    await request(app.getHttpServer())
      .get('/problems?q=Array')
      .set('Authorization', 'Bearer developer')
      .expect(200);
    expect(problems.list).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ q: 'Array', page: 1, pageSize: 20 }),
    );
  });
  it('assigns/unassigns a selected developer with the verified admin actor', async () => {
    await request(app.getHttpServer())
      .post(`/admin/developers/${user}/skills/${skill}`)
      .set('Authorization', 'Bearer admin')
      .expect(201);
    expect(assignments.assign).toHaveBeenLastCalledWith(
      user,
      user,
      skill,
      true,
    );
    await request(app.getHttpServer())
      .delete(`/admin/developers/${user}/skills/${skill}`)
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(assignments.assign).toHaveBeenLastCalledWith(
      user,
      user,
      skill,
      false,
    );
  });
  it('derives developer reads from the authenticated identity and validates IDs', async () => {
    await request(app.getHttpServer())
      .get('/me/skill-assignments')
      .set('Authorization', 'Bearer developer')
      .expect(200);
    expect(assignments.list).toHaveBeenCalledWith(user);
    await request(app.getHttpServer())
      .post(`/admin/developers/invalid/skills/${skill}`)
      .set('Authorization', 'Bearer admin')
      .expect(400);
  });
  it('deletes by archiving without destroying referenced records', async () => {
    for (const endpoint of ['skills', 'technologies']) {
      await request(app.getHttpServer())
        .delete(`/admin/${endpoint}/${skill}`)
        .set('Authorization', 'Bearer developer')
        .expect(403);
      await request(app.getHttpServer())
        .delete(`/admin/${endpoint}/${skill}`)
        .set('Authorization', 'Bearer admin')
        .expect(200);
    }
    expect(skills.setActive).toHaveBeenCalledWith(skill, false, user);
    expect(technologies.setActive).toHaveBeenCalledWith(skill, false, user);
  });
  it('rejects blank names after trimming and missing categories', async () => {
    await request(app.getHttpServer())
      .post('/admin/skills')
      .set('Authorization', 'Bearer admin')
      .send({ name: '   ', categoryId: skill })
      .expect(400);
    await request(app.getHttpServer())
      .post('/admin/skills')
      .set('Authorization', 'Bearer admin')
      .send({ name: 'SQL' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/admin/technologies')
      .set('Authorization', 'Bearer admin')
      .send({ name: '   ' })
      .expect(400);
    expect(skills.create).not.toHaveBeenCalled();
    expect(technologies.create).not.toHaveBeenCalled();
  });
});

describe('Measured progression is driven by validated attempts', () => {
  it('uses validated database attempts and existing scoring weights, never an assignment score', async () => {
    const writes: { table: string; value: unknown }[] = [];
    const filters: unknown[][] = [];
    let attempts: { challenge_id: string; accuracy: number }[] = [];
    let last: { level_score: number; validated_attempts: number } | null = null;
    const client = {
      from: (table: string) => {
        const chain = {
          select: () => chain,
          eq: (...args: unknown[]) => {
            filters.push(args);
            return chain;
          },
          in: () => chain,
          limit: () => chain,
          order: () => chain,
          maybeSingle: () =>
            Promise.resolve({
              data: table === 'skills' ? { id: 'skill' } : last,
              error: null,
            }),
          upsert: (value: unknown) => {
            writes.push({ table, value });
            return Promise.resolve({ error: null });
          },
          insert: (value: unknown) => {
            writes.push({ table, value });
            return { error: null };
          },
          then: (resolve: (value: unknown) => unknown) =>
            Promise.resolve({
              data:
                table === 'challenge_skills'
                  ? [{ challenge_id: 'challenge', weight: 2 }]
                  : table === 'attempts'
                    ? attempts
                    : [{ id: 'challenge', difficulty: 'advanced' }],
              error: null,
            }).then(resolve),
        };
        return chain;
      },
    };
    const service = new SkillProgressService({
      client,
    } as unknown as SupabaseService);
    const before = await service.recalculate('developer', 'skill');
    expect(before.levelScore).toBeNull();
    expect(before.status).toBe('not_evaluated');
    attempts = [{ challenge_id: 'challenge', accuracy: 0.8 }];
    last = { level_score: 0, validated_attempts: 0 };
    const after = await service.recalculate('developer', 'skill');
    expect(after.levelScore).toBe(80);
    expect(after.validatedAttempts).toBe(1);
    const historyWrites = writes.filter(
      (w) => w.table === 'user_skill_history',
    ).length;
    attempts = [
      { challenge_id: 'challenge', accuracy: 0.8 },
      { challenge_id: 'challenge', accuracy: 0.7 },
    ];
    last = { level_score: 80, validated_attempts: 1 };
    const repeated = await service.recalculate('developer', 'skill');
    expect(repeated.levelScore).toBe(80);
    expect(repeated.validatedAttempts).toBe(1);
    expect(writes.filter((w) => w.table === 'user_skill_history')).toHaveLength(
      historyWrites,
    );
    expect(filters).toContainEqual(['is_validated', true]);
    expect(writes.some((w) => w.table === 'user_skill_history')).toBe(true);
    expect(
      writes.every((w) =>
        ['user_skill_history', 'user_skill_progress'].includes(w.table),
      ),
    ).toBe(true);
  });
});
