import { MeSkillsController } from './me-skills.controller';
import { SkillProgressService } from './skill-progress.service';
import { ATTEMPT_VALIDATED } from './events/attempt-validated.event';

describe('MeSkillsController', () => {
  let controller: MeSkillsController;
  let mockProgress: Partial<SkillProgressService>;
  let mockSupabase: any;
  let mockEvents: { emit: jest.Mock };

  beforeEach(() => {
    mockProgress = {
      getUserProgressWithDelta: jest.fn().mockResolvedValue([]),
      getUserHistory: jest.fn().mockResolvedValue([]),
    };
    mockSupabase = {
      client: {
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null }),
        }),
      },
    };
    mockEvents = { emit: jest.fn() };

    controller = new MeSkillsController(
      mockProgress as SkillProgressService,
      mockSupabase as any,
      mockEvents as any,
    );
  });

  it('records attempt for authenticated user and emits ATTEMPT_VALIDATED on success', async () => {
    const req = { user: { id: 'user-dev-123' } } as any;
    const challengeId = '33333333-3333-4333-8333-333333333333';

    const result = await controller.recordMyAttempt(req, challengeId, {
      isSuccess: true,
      accuracy: 0.85,
    });

    expect(result.success).toBe(true);
    expect(result.userId).toBe('user-dev-123');
    expect(result.challengeId).toBe(challengeId);
    expect(result.isSuccess).toBe(true);
    expect(result.accuracy).toBe(0.85);

    expect(mockSupabase.client.from).toHaveBeenCalledWith('attempts');
    expect(mockEvents.emit).toHaveBeenCalledWith(
      ATTEMPT_VALIDATED,
      expect.objectContaining({
        userId: 'user-dev-123',
        challengeId,
      }),
    );
  });

  it('clamps accuracy between 0 and 1', async () => {
    const req = { user: { id: 'user-dev-123' } } as any;
    const challengeId = '33333333-3333-4333-8333-333333333333';

    const result = await controller.recordMyAttempt(req, challengeId, {
      isSuccess: true,
      accuracy: 1.5,
    });

    expect(result.accuracy).toBe(1.0);
  });

  it('does not emit ATTEMPT_VALIDATED if attempt failed (isSuccess false)', async () => {
    const req = { user: { id: 'user-dev-123' } } as any;
    const challengeId = '33333333-3333-4333-8333-333333333333';

    const result = await controller.recordMyAttempt(req, challengeId, {
      isSuccess: false,
    });

    expect(result.isSuccess).toBe(false);
    expect(mockEvents.emit).not.toHaveBeenCalled();
  });

  it('records duel attempt and calculates accuracy from correct answers', async () => {
    const req = { user: { id: 'user-dev-123' } } as any;
    mockSupabase.client.from = jest.fn((table: string) => {
      if (table === 'challenge_skills') {
        return {
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [{ challenge_id: '11111111-1111-4111-8111-111111111111' }],
            }),
          }),
        };
      }
      return {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };
    });

    const result = await controller.recordDuelAttempt(req, {
      correctAnswers: 7,
      totalQuestions: 10,
    });

    expect(result.success).toBe(true);
    expect(result.accuracy).toBe(0.7);
    expect(result.isSuccess).toBe(true);
    expect(mockEvents.emit).toHaveBeenCalledWith(
      ATTEMPT_VALIDATED,
      expect.objectContaining({
        userId: 'user-dev-123',
        challengeId: '11111111-1111-4111-8111-111111111111',
      }),
    );
  });
});
