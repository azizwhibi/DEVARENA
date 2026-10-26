import {
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import request from 'supertest';
import type { Server } from 'node:http';
import { AuthService } from '../auth/auth.service';
import { UserGuard } from '../auth/guards';
import { ProblemDetailsFilter } from '../common/problem-details.filter';
import { RankRewardListener } from '../rankings/rank-reward.listener';
import { MeSkillsController } from './me-skills.controller';
import { SupabaseService } from './skills-database.service';
import { SkillProgressService } from './skill-progress.service';
import { AttemptValidatedListener } from './events/attempt-validated.listener';

const userId = '11111111-1111-4111-8111-111111111111';
const challengeId = '33333333-3333-4333-8333-333333333333';
const question =
  'In NestJS, how can a Global Exception Filter catch all errors and return the correct HTTP status?';

describe('competitive challenge real Nest event and request boundaries', () => {
  let app: INestApplication;
  let controller: MeSkillsController;
  const recalculate = jest.fn();
  const checkAndGrant = jest.fn();
  const authenticate = jest.fn();
  const insert = jest.fn();
  const rpc = jest.fn();
  const from = jest.fn();
  const challenge = {
    id: challengeId,
    title: 'NestJS exception filters',
    is_published: true,
  };

  beforeEach(async () => {
    for (const mock of [
      recalculate,
      checkAndGrant,
      authenticate,
      insert,
      rpc,
      from,
    ])
      mock.mockReset();
    recalculate.mockResolvedValue(undefined);
    checkAndGrant.mockResolvedValue({ awarded: false });
    authenticate.mockImplementation(async (authorization?: string) => {
      if (!authorization) throw new UnauthorizedException();
      if (authorization === 'Bearer suspended')
        throw new ForbiddenException({
          code: 'account_suspended',
          message: 'Account suspended.',
        });
      return { id: userId, role: 'developer', status: 'active' };
    });
    insert.mockReturnValue({
      select: () => ({
        single: async () => ({ data: { id: 'attempt' }, error: null }),
      }),
    });
    rpc.mockResolvedValue({ data: { mastery_points: 150 }, error: null });
    from.mockImplementation((table: string) =>
      table === 'attempts'
        ? { insert }
        : {
            select: () => ({
              eq: () =>
                table === 'challenge_skills'
                  ? Promise.resolve({
                      data: [{ skill_id: 'skill' }],
                      error: null,
                    })
                  : {
                      maybeSingle: async () => ({
                        data: challenge,
                        error: null,
                      }),
                    },
            }),
          },
    );
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      controllers: [MeSkillsController],
      providers: [
        AttemptValidatedListener,
        UserGuard,
        { provide: AuthService, useValue: { authenticate } },
        { provide: SupabaseService, useValue: { client: { from, rpc } } },
        { provide: SkillProgressService, useValue: { recalculate } },
        { provide: RankRewardListener, useValue: { checkAndGrant } },
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
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
    controller = app.get(MeSkillsController);
  });
  afterEach(async () => app.close());

  it('waits for the decorated asynchronous skill listener before checking rank rewards', async () => {
    let release!: () => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    recalculate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
          markStarted();
        }),
    );
    const attempt = controller.recordMyAttempt(
      { user: { id: userId } } as never,
      challengeId,
      { question, answerId: 'opt-1' },
    );
    await started;
    try {
      expect(recalculate).toHaveBeenCalledWith(userId, 'skill');
      expect(checkAndGrant).not.toHaveBeenCalled();
    } finally {
      release();
      await attempt;
    }
    expect(await attempt).toMatchObject({
      masteryPoints: 150,
      rankReward: { awarded: false },
    });
    expect(checkAndGrant).toHaveBeenCalledTimes(1);
  });

  it('propagates a required recalculation failure before any credit award', async () => {
    recalculate.mockRejectedValueOnce(new Error('recalculation unavailable'));
    await expect(
      controller.recordMyAttempt(
        { user: { id: userId } } as never,
        challengeId,
        { question, answerId: 'opt-1' },
      ),
    ).rejects.toThrow('Skill progress is temporarily unavailable.');
    expect(checkAndGrant).not.toHaveBeenCalled();
  });

  it('fails closed when the challenge lookup cannot establish publication or its answer key', async () => {
    from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: null,
            error: { message: 'upstream private detail' },
          }),
        }),
      }),
    });
    await expect(
      controller.recordMyAttempt(
        { user: { id: userId } } as never,
        challengeId,
        { question, answerId: 'opt-1' },
      ),
    ).rejects.toThrow('Challenge is temporarily unavailable.');
    expect(insert).not.toHaveBeenCalled();
    expect(checkAndGrant).not.toHaveBeenCalled();
  });

  it('does not grant rewards or recalculate when the validated attempt cannot be saved', async () => {
    insert.mockReturnValueOnce({
      select: () => ({
        single: async () => ({
          data: null,
          error: { message: 'upstream private detail' },
        }),
      }),
    });
    await expect(
      controller.recordMyAttempt(
        { user: { id: userId } } as never,
        challengeId,
        { question, answerId: 'opt-1' },
      ),
    ).rejects.toThrow('Attempt could not be saved.');
    expect(rpc).not.toHaveBeenCalled();
    expect(recalculate).not.toHaveBeenCalled();
    expect(checkAndGrant).not.toHaveBeenCalled();
  });

  it('does not continue into rank rewards when the mastery transaction fails', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'upstream private detail' },
    });
    await expect(
      controller.recordMyAttempt(
        { user: { id: userId } } as never,
        challengeId,
        { question, answerId: 'opt-1' },
      ),
    ).rejects.toThrow('Challenge rewards are temporarily unavailable.');
    expect(recalculate).not.toHaveBeenCalled();
    expect(checkAndGrant).not.toHaveBeenCalled();
  });

  it('leaves empty or accuracy-only solo practice outside database progress', async () => {
    for (const [input, accuracy] of [
      [{}, 0],
      [{ accuracy: 0.75 }, 0.75],
    ] as const) {
      expect(
        await controller.recordDuelAttempt(
          { user: { id: userId } } as never,
          input,
        ),
      ).toMatchObject({ accuracy, masteryPoints: 0, competitive: false });
    }
    expect(from).not.toHaveBeenCalled();
    expect(checkAndGrant).not.toHaveBeenCalled();
  });

  it('rejects legacy client success claims at the HTTP validation boundary', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post(`/me/skills/challenges/${challengeId}/attempt`)
      .set('Authorization', 'Bearer active')
      .send({ isSuccess: true, accuracy: 1 });
    expect(response.status).toBe(400);
    expect(response.type).toBe('application/problem+json');
    expect(from).not.toHaveBeenCalled();
    expect(checkAndGrant).not.toHaveBeenCalled();
  });

  it.each([
    { token: undefined, status: 401 },
    { token: 'suspended', status: 403 },
  ])(
    'rejects unauthorized/suspended accounts before any grading $status',
    async ({ token, status }) => {
      const call = request(app.getHttpServer() as Server).post(
        `/me/skills/challenges/${challengeId}/attempt`,
      );
      if (token) call.set('Authorization', `Bearer ${token}`);
      const response = await call.send({ question, answerId: 'opt-1' });
      expect(response.status).toBe(status);
      expect(response.type).toBe('application/problem+json');
      expect(from).not.toHaveBeenCalled();
    },
  );

  it('validates UUIDs before accessing storage', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/me/skills/challenges/not-a-uuid/attempt')
      .set('Authorization', 'Bearer active')
      .send({ question, answerId: 'opt-1' });
    expect(response.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
});
