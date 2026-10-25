import { ProgressAdminController } from './progress-admin.controller';
import { SkillProgressService } from './skill-progress.service';
import { ATTEMPT_VALIDATED } from './events/attempt-validated.event';

describe('SkillProgress & Dynamic Scoring', () => {
  let controller: ProgressAdminController;
  let mockProgress: Partial<SkillProgressService>;
  let mockEvents: { emit: jest.Mock };
  let mockSupabase: any;

  beforeEach(() => {
    mockProgress = {
      getUserProgress: jest.fn(),
      recalculate: jest.fn(),
    };
    mockEvents = { emit: jest.fn() };
    mockSupabase = {
      client: {
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null }),
        }),
      },
    };

    controller = new ProgressAdminController(
      mockProgress as SkillProgressService,
      mockEvents as any,
      mockSupabase as any,
    );
  });

  it('ensures static applyAttemptResult method does NOT exist on SkillProgressService', () => {
    expect((SkillProgressService.prototype as any).applyAttemptResult).toBeUndefined();
  });

  it('recordAttempt inserts attempt row and emits ATTEMPT_VALIDATED event on success', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const challengeId = '22222222-2222-4222-8222-222222222222';

    const res = await controller.recordAttempt(userId, challengeId, {
      isSuccess: true,
      accuracy: 0.9,
    });

    expect(res.success).toBe(true);
    expect(res.isSuccess).toBe(true);
    expect(res.accuracy).toBe(0.9);

    expect(mockSupabase.client.from).toHaveBeenCalledWith('attempts');
    expect(mockEvents.emit).toHaveBeenCalledWith(
      ATTEMPT_VALIDATED,
      expect.objectContaining({ userId, challengeId }),
    );
  });

  it('recordAttempt does not emit ATTEMPT_VALIDATED if attempt failed (accuracy 0)', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const challengeId = '22222222-2222-4222-8222-222222222222';

    const res = await controller.recordAttempt(userId, challengeId, {
      isSuccess: false,
    });

    expect(res.success).toBe(true);
    expect(res.isSuccess).toBe(false);
    expect(mockEvents.emit).not.toHaveBeenCalled();
  });

  it('simulate-validated delegates to recordAttempt with full accuracy', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const challengeId = '22222222-2222-4222-8222-222222222222';

    const res = await controller.simulate(userId, challengeId);

    expect(res.isSuccess).toBe(true);
    expect(res.accuracy).toBe(1.0);
    expect(mockEvents.emit).toHaveBeenCalledWith(
      ATTEMPT_VALIDATED,
      expect.objectContaining({ userId, challengeId }),
    );
  });
});
