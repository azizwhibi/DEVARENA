import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:net';
import { AuthService } from '../../auth/auth.service';
import { UserGuard } from '../../auth/guards';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';

describe('Authenticated developer practice API', () => {
  const user = '00000000-0000-4000-8000-000000000001';
  const problem = '00000000-0000-4000-8000-000000000002';
  const service = {
    start: jest.fn().mockResolvedValue({}),
    answer: jest.fn().mockResolvedValue({ correct: true, verified: false }),
    summary: jest.fn().mockResolvedValue({ completedProblems: 0 }),
  };
  let app: INestApplication<Server>;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PracticeController],
      providers: [
        { provide: PracticeService, useValue: service },
        UserGuard,
        {
          provide: AuthService,
          useValue: {
            authenticate: (header?: string) => {
              if (header !== 'Bearer developer')
                throw new UnauthorizedException();
              return { id: user, role: 'developer' };
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
  it('requires authentication and scopes starts and summary reads to the signed-in account', async () => {
    await request(app.getHttpServer()).get('/me/practice/summary').expect(401);
    await request(app.getHttpServer())
      .post(`/me/practice/${problem}/start`)
      .expect(401);
    await request(app.getHttpServer())
      .post(`/me/practice/${problem}/answer`)
      .expect(401);
    await request(app.getHttpServer())
      .get('/me/practice/summary?userId=another-user')
      .set('Authorization', 'Bearer developer')
      .expect(200);
    expect(service.summary).toHaveBeenCalledWith(user);
    await request(app.getHttpServer())
      .post(`/me/practice/${problem}/start`)
      .set('Authorization', 'Bearer developer')
      .expect(200);
    expect(service.start).toHaveBeenCalledWith(user, problem);
  });
  it('rejects forged outcomes, unknown answer IDs, missing sessions and invalid problem IDs', async () => {
    const endpoint = `/me/practice/${problem}/answer`;
    for (const body of [
      { session: 'x'.repeat(30), optionId: 'opt-1', isSuccess: true },
      { session: 'x'.repeat(30), optionId: 'opt-1', userId: user },
      { session: 'x'.repeat(30), optionId: 'opt-1', is_validated: true },
      { session: 'x'.repeat(30), optionId: 'unknown' },
      { optionId: 'opt-1' },
    ])
      await request(app.getHttpServer())
        .post(endpoint)
        .set('Authorization', 'Bearer developer')
        .send(body)
        .expect(400);
    await request(app.getHttpServer())
      .post('/me/practice/invalid/start')
      .set('Authorization', 'Bearer developer')
      .expect(400);
    expect(service.answer).not.toHaveBeenCalled();
  });
  it('accepts only session and selected option, with identity supplied by the guard', async () => {
    const body = { session: 'x'.repeat(30), optionId: 'opt-2' };
    await request(app.getHttpServer())
      .post(`/me/practice/${problem}/answer`)
      .set('Authorization', 'Bearer developer')
      .send(body)
      .expect(200, { correct: true, verified: false });
    expect(service.answer).toHaveBeenCalledWith(
      user,
      problem,
      expect.objectContaining(body),
    );
  });
});
