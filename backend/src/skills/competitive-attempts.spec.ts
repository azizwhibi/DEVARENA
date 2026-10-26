import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MeSkillsController } from './me-skills.controller';
import { ATTEMPT_VALIDATED } from './events/attempt-validated.event';

const prompt =
  'In NestJS, how can a Global Exception Filter catch all errors and return the correct HTTP status?';
const challengeId = '33333333-3333-4333-8333-333333333333';

describe('competitive practice awards', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const req = { user: { id: userId, role: 'developer' } } as never;
  let db: any;
  let events: any;
  let rewards: any;
  let controller: MeSkillsController;
  let order: string[];

  beforeEach(() => {
    order = [];
    const row = {
      id: challengeId,
      title: 'NestJS exception filters',
      is_published: true,
    };
    const query: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
      insert: jest.fn().mockReturnThis(),
      single: jest
        .fn()
        .mockResolvedValue({ data: { id: 'attempt-id' }, error: null }),
    };
    db = {
      client: {
        from: jest.fn().mockReturnValue(query),
        rpc: jest.fn().mockImplementation(async () => {
          order.push('mastery');
          return {
            data: { awarded: true, mastery_points: 150, first_clear: true },
            error: null,
          };
        }),
      },
    };
    events = {
      emitAsync: jest.fn().mockImplementation(async () => {
        order.push('recalculate');
        return [true];
      }),
    };
    rewards = {
      checkAndGrant: jest.fn().mockImplementation(async () => {
        order.push('reward');
        return {
          awarded: true,
          tier: 'Silver',
          credits_awarded: 350,
          new_balance: 350,
        };
      }),
    };
    controller = new MeSkillsController({} as never, db, events, rewards);
  });

  it('stores server-graded results, then awaits recalculation before awarding credits', async () => {
    const result = await controller.recordMyAttempt(req, challengeId, {
      question: prompt,
      answerId: 'opt-1',
    });
    expect(db.client.from('attempts').insert).toHaveBeenCalledWith(
      expect.objectContaining({
        accuracy: 1,
        is_validated: true,
        metadata: { source: 'competitive_challenge', server_validated: true },
      }),
    );
    expect(events.emitAsync).toHaveBeenCalledWith(
      ATTEMPT_VALIDATED,
      expect.objectContaining({ userId, challengeId }),
    );
    expect(order).toEqual(['mastery', 'recalculate', 'reward']);
    expect(result).toMatchObject({
      accuracy: 1,
      isSuccess: true,
      masteryPoints: 150,
      rankReward: { awarded: true },
    });
  });

  it('does not trust a client success or accuracy claim', async () => {
    await expect(
      controller.recordMyAttempt(req, challengeId, {
        isSuccess: true,
        accuracy: 1,
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(db.client.from('attempts').insert).not.toHaveBeenCalled();
  });

  it('selects the server-authorized question bank for a generic challenge', async () => {
    db.client.from('challenges').maybeSingle.mockResolvedValueOnce({ data: {
      title: 'Expert challenge', is_published: true,
      challenge_skills: [{ skills: { id: 'sql', name: 'SQL indexes', slug: 'sql' } }],
    }, error: null });
    expect(await controller.questionBank(challengeId)).toEqual({ bank: 'SQL_QUESTIONS' });
  });

  it('does not award mastery or credits for a wrong answer', async () => {
    const result = await controller.recordMyAttempt(req, challengeId, {
      question: prompt,
      answerId: 'opt-2',
    });
    expect(result).toMatchObject({
      isSuccess: false,
      masteryPoints: 0,
      rankReward: null,
    });
    expect(events.emitAsync).not.toHaveBeenCalled();
    expect(rewards.checkAndGrant).not.toHaveBeenCalled();
  });

  it('rejects missing or unpublished challenges', async () => {
    db.client
      .from('challenges')
      .maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(
      controller.recordMyAttempt(req, challengeId, {
        question: prompt,
        answerId: 'opt-1',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('does not award credits when recalculation fails', async () => {
    events.emitAsync.mockRejectedValueOnce(new Error('offline'));
    await expect(
      controller.recordMyAttempt(req, challengeId, {
        question: prompt,
        answerId: 'opt-1',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(rewards.checkAndGrant).not.toHaveBeenCalled();
  });

  it('keeps client-reported solo practice out of competitive progress and rewards', async () => {
    const result = await controller.recordDuelAttempt(req, {
      correctAnswers: 10,
      totalQuestions: 10,
    });
    expect(result).toMatchObject({ competitive: false, masteryPoints: 0 });
    expect(events.emitAsync).not.toHaveBeenCalled();
    expect(rewards.checkAndGrant).not.toHaveBeenCalled();
    expect(db.client.from).not.toHaveBeenCalled();
  });
});
