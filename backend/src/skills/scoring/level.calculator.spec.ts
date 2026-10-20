import { computeLevel, statusFromScore } from './level.calculator';

const a = (accuracy: number, difficulty: string, linkWeight = 1) => ({
  accuracy,
  difficulty,
  linkWeight,
});

describe('computeLevel', () => {
  it('aucune tentative : non evalue et score null', () => {
    const r = computeLevel([]);
    expect(r.status).toBe('not_evaluated');
    expect(r.levelScore).toBeNull();
    expect(r.validatedAttempts).toBe(0);
  });

  it('formule ponderee par difficulte et poids du lien', () => {
    // (0.8*1 + 0.5*2 + 1.0*3) / 6 = 0.8
    const r = computeLevel([a(0.8, 'easy'), a(0.5, 'medium'), a(1, 'hard')]);
    expect(r.levelScore).toBe(80);
    expect(r.status).toBe('advanced');
  });

  it('le poids du lien compte', () => {
    // (1*1*3 + 0*1*1 + 0*1*1) / 5 = 0.6
    const r = computeLevel([a(1, 'easy', 3), a(0, 'easy'), a(0, 'easy')]);
    expect(r.levelScore).toBe(60);
  });
});

describe('statusFromScore', () => {
  it.each([
    [0, 'beginner'],
    [34.99, 'beginner'],
    [35, 'intermediate'],
    [64.99, 'intermediate'],
    [65, 'advanced'],
    [84.99, 'advanced'],
    [85, 'expert'],
    [100, 'expert'],
  ])('%s -> %s', (score, expected) => {
    expect(statusFromScore(score)).toBe(expected);
  });
});
