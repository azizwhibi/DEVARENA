import { MeSkillsController } from './me-skills.controller';
import { validate } from 'class-validator';
import {
  SubmitChallengeAnswerDto,
  SoloPracticeDto,
} from './dto/submit-challenge-answer.dto';

describe('MeSkillsController access and validation', () => {
  const progress = {
    getUserProgressWithDelta: jest.fn(),
    getUserHistory: jest.fn(),
  };
  const controller = new MeSkillsController(
    progress as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const req = { user: { id: 'developer' } } as never;

  it('loads only the authenticated user progress and history', () => {
    controller.list(req);
    controller.history(req, 'skill');
    expect(progress.getUserProgressWithDelta).toHaveBeenCalledWith('developer');
    expect(progress.getUserHistory).toHaveBeenCalledWith('developer', 'skill');
  });

  it('requires a real question and valid answer id instead of a success flag', async () => {
    expect(
      await validate(
        Object.assign(new SubmitChallengeAnswerDto(), {
          question: 'Question',
          answerId: 'opt-2',
        }),
      ),
    ).toHaveLength(0);
    expect(await validate(new SubmitChallengeAnswerDto())).toHaveLength(2);
    expect(
      await validate(
        Object.assign(new SubmitChallengeAnswerDto(), {
          question: 'Question',
          answerId: 'correct',
        }),
      ),
    ).not.toHaveLength(0);
  });

  it.each([NaN, Infinity, -0.1, 1.1])(
    'rejects invalid solo accuracy %s',
    async (accuracy) => {
      expect(
        await validate(Object.assign(new SoloPracticeDto(), { accuracy })),
      ).not.toHaveLength(0);
    },
  );

  it('keeps solo practice informational', async () => {
    const result = await controller.recordDuelAttempt(req, {
      correctAnswers: 7,
      totalQuestions: 10,
    });
    expect(result).toMatchObject({
      accuracy: 0.7,
      isSuccess: true,
      competitive: false,
      masteryPoints: 0,
    });
  });
});
