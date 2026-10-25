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
import { CodeReviewController } from './code-review.controller';
import { CodeReviewService } from './code-review.service';

describe('Authenticated code review API', () => {
  const user = '00000000-0000-4000-8000-000000000001';
  const problem = '00000000-0000-4000-8000-000000000002';
  const dto = {
    submissionId: '00000000-0000-4000-8000-000000000003',
    language: 'python',
    code: 'def solve(values):\n    return list(set(values))',
  };
  const service = {
    submit: jest.fn().mockResolvedValue({ passed: true, verified: false }),
    summary: jest.fn().mockResolvedValue({ solvedProblems: 0 }),
    get: jest.fn().mockResolvedValue({}),
    detail: jest.fn().mockResolvedValue({}),
  };
  let app: INestApplication<Server>;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CodeReviewController],
      providers: [
        { provide: CodeReviewService, useValue: service },
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
  it('requires authentication on submission, reads, problem details and summary', async () => {
    for (const path of [
      '/me/code-reviews/summary',
      '/me/code-reviews/' + dto.submissionId,
      '/me/code-reviews/problems/' + problem,
    ])
      await request(app.getHttpServer()).get(path).expect(401);
    await request(app.getHttpServer())
      .post('/me/code-reviews/problems/' + problem)
      .send(dto)
      .expect(401);
  });
  it('takes identity from the session and refuses client-supplied outcomes or oversized input', async () => {
    const endpoint = '/me/code-reviews/problems/' + problem;
    for (const body of [
      { ...dto, score: 100 },
      { ...dto, passed: true },
      { ...dto, userId: user },
      { ...dto, is_validated: true },
      { ...dto, language: 'shell' },
      { ...dto, code: 'x'.repeat(20001) },
      { ...dto, code: '' },
      { ...dto, submissionId: 'bad' },
    ])
      await request(app.getHttpServer())
        .post(endpoint)
        .set('Authorization', 'Bearer developer')
        .send(body)
        .expect(400);
    expect(service.submit).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', 'Bearer developer')
      .send(dto)
      .expect(200, { passed: true, verified: false });
    expect(service.submit).toHaveBeenCalledWith(
      user,
      problem,
      expect.objectContaining(dto),
    );
    await request(app.getHttpServer())
      .get('/me/code-reviews/summary?userId=other')
      .set('Authorization', 'Bearer developer')
      .expect(200);
    expect(service.summary).toHaveBeenCalledWith(user);
  });
  it('validates IDs on both reads and submissions', async () => {
    await request(app.getHttpServer())
      .get('/me/code-reviews/not-a-uuid')
      .set('Authorization', 'Bearer developer')
      .expect(400);
    await request(app.getHttpServer())
      .post('/me/code-reviews/problems/not-a-uuid')
      .set('Authorization', 'Bearer developer')
      .send(dto)
      .expect(400);
    expect(service.get).not.toHaveBeenCalled();
    expect(service.submit).not.toHaveBeenCalled();
  });
});
