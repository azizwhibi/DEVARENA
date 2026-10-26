import { AttemptValidatedListener } from './attempt-validated.listener';
import { AttemptValidatedEvent } from './attempt-validated.event';

function setup(result: {
  data: { skill_id: string }[] | null;
  error: unknown;
}) {
  const recalculate = jest.fn().mockResolvedValue(undefined);
  const eq = jest.fn().mockResolvedValue(result);
  const listener = new AttemptValidatedListener(
    { client: { from: () => ({ select: () => ({ eq }) }) } } as never,
    { recalculate } as never,
  );
  return { listener, recalculate, eq };
}

describe('required versus legacy skill recalculation delivery', () => {
  it('keeps legacy fire-and-forget failures handled without propagating database details', async () => {
    const { listener, recalculate } = setup({
      data: null,
      error: { message: 'private upstream data' },
    });
    await expect(
      listener.handle(new AttemptValidatedEvent('user', 'challenge')),
    ).resolves.toBeUndefined();
    expect(recalculate).not.toHaveBeenCalled();
  });
  it('rejects required checks with a sanitized failure when linked skills cannot be loaded', async () => {
    const { listener, recalculate } = setup({
      data: null,
      error: { message: 'private upstream data' },
    });
    await expect(
      listener.handle(new AttemptValidatedEvent('user', 'challenge', true)),
    ).rejects.toThrow('Skill progress recalculation failed.');
    expect(recalculate).not.toHaveBeenCalled();
  });
  it('completes a catalog entry with no linked skills without inventing progress', async () => {
    const { listener, recalculate } = setup({ data: null, error: null });
    await expect(
      listener.handle(new AttemptValidatedEvent('user', 'challenge', true)),
    ).resolves.toBe(true);
    expect(recalculate).not.toHaveBeenCalled();
  });
  it('recalculates every linked skill before completing', async () => {
    const { listener, recalculate, eq } = setup({
      data: [{ skill_id: 'one' }, { skill_id: 'two' }],
      error: null,
    });
    await expect(
      listener.handle(new AttemptValidatedEvent('user', 'challenge', true)),
    ).resolves.toBe(true);
    expect(eq).toHaveBeenCalledWith('challenge_id', 'challenge');
    expect(recalculate.mock.calls).toEqual([
      ['user', 'one'],
      ['user', 'two'],
    ]);
  });
});
