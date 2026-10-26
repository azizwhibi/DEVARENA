import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ProblemsAdminController } from './problems.controller';
import { ProblemsService } from './problems.service';
import { AuthService } from '../auth/auth.service';
import { AdminGuard } from '../auth/guards';
describe('Problem administrator HTTP boundaries', () => {
  let app: INestApplication;
  const id = '00000000-0000-4000-8000-000000000001';
  const service = {
    write: jest.fn().mockResolvedValue({ id }),
    detail: jest.fn().mockResolvedValue({ id }),
    action: jest.fn().mockResolvedValue({ saved: true }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProblemsAdminController],
      providers: [
        AdminGuard,
        { provide: ProblemsService, useValue: service },
        {
          provide: AuthService,
          useValue: {
            authenticate: async (value: string) => {
              if (!value) throw new UnauthorizedException();
              return {
                id,
                role: value === 'Bearer admin' ? 'admin' : 'developer',
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
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => app.close());
  const fields = {
    title: 'Fixture problem',
    description: 'Find a matching item.',
    difficulty: 'beginner',
    topicIds: [],
    skills: [],
  };
  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/admin/problems')
      .send(fields)
      .expect(401);
    await request(app.getHttpServer())
      .get('/admin/problems/' + id)
      .expect(401);
  });
  it('allows administrators to open CSV UUID-v5 problems while rejecting developers', async () => {
    const importedId = 'a93c639c-d4e6-52f4-afef-cf2da0beda43';
    await request(app.getHttpServer())
      .get('/admin/problems/' + importedId)
      .set('Authorization', 'Bearer developer')
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/problems/' + importedId)
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(service.detail).toHaveBeenCalledWith(importedId);
  });
  it('rejects developers on every mutation', async () => {
    await request(app.getHttpServer())
      .post('/admin/problems')
      .set('Authorization', 'Bearer developer')
      .send(fields)
      .expect(403);
    await request(app.getHttpServer())
      .delete('/admin/problems/' + id)
      .set('Authorization', 'Bearer developer')
      .expect(403);
    await request(app.getHttpServer())
      .post('/admin/problems/' + id + '/publish')
      .set('Authorization', 'Bearer developer')
      .expect(403);
  });
  it('validates titles and rejects invented verdict/score fields', async () => {
    await request(app.getHttpServer())
      .post('/admin/problems')
      .set('Authorization', 'Bearer admin')
      .send({ ...fields, title: ' ' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/admin/problems')
      .set('Authorization', 'Bearer admin')
      .send({ ...fields, is_validated: true })
      .expect(400);
  });
  it('validates nested skill weights', async () => {
    await request(app.getHttpServer())
      .post('/admin/problems')
      .set('Authorization', 'Bearer admin')
      .send({ ...fields, skills: [{ skillId: id, weight: 4 }] })
      .expect(400);
  });
  it('takes actor from the authenticated account', async () => {
    await request(app.getHttpServer())
      .post('/admin/problems')
      .set('Authorization', 'Bearer admin')
      .send(fields)
      .expect(201);
    expect(service.write).toHaveBeenCalledWith(
      id,
      null,
      expect.objectContaining(fields),
    );
  });
  it('supports edit, publication, archival and draft deletion', async () => {
    await request(app.getHttpServer())
      .patch('/admin/problems/' + id)
      .set('Authorization', 'Bearer admin')
      .send(fields)
      .expect(200);
    for (const action of ['publish', 'archive'])
      await request(app.getHttpServer())
        .post('/admin/problems/' + id + '/' + action)
        .set('Authorization', 'Bearer admin')
        .expect(201);
    await request(app.getHttpServer())
      .delete('/admin/problems/' + id)
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(service.action).toHaveBeenCalledWith(id, id, 'delete');
  });
});
