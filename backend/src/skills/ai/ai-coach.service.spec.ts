import { AiCoachService } from './ai-coach.service';
import type { AiProvider } from './ai-provider.interface';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeService(aiResponse: unknown | null): AiCoachService {
  const fakeAi: AiProvider = {
    generateJson: jest.fn().mockResolvedValue(aiResponse),
  };

  const fakeSupabase = {
    client: {
      from: jest.fn().mockImplementation((table: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ error: null }),
        // Simule une réponse vide pour toutes les tables
        data:
          table === 'user_skill_progress'
            ? [
                {
                  skill_id: 'skill-1',
                  status: 'not_evaluated',
                  level_score: null,
                  skills: { name: 'Jointures SQL' },
                },
                {
                  skill_id: 'skill-2',
                  status: 'beginner',
                  level_score: 20,
                  skills: { name: 'React Hooks' },
                },
              ]
            : [],
        error: null,
        count: null,
      })),
    },
  };

  const fakeConfig = {
    get: jest.fn().mockReturnValue(undefined),
  };

  // On bypasse DI : instanciation directe pour les tests unitaires
  return new AiCoachService(fakeSupabase as any, fakeConfig as any, fakeAi);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AiCoachService — validation JSON', () => {
  it('accepte une réponse IA valide avec challenge dans la liste candidate', () => {
    const validResponse = {
      observation: 'Ton niveau est bon sur React.',
      skill_id: 'skill-2',
      challenge_id: 'chal-1',
      reason: 'Ce défi renforce tes bases.',
    };
    // isCoachJson doit passer
    expect(typeof validResponse.observation).toBe('string');
    expect(validResponse.observation.length).toBeLessThanOrEqual(200);
    expect(typeof validResponse.skill_id).toBe('string');
    expect(typeof validResponse.challenge_id).toBe('string');
    expect(typeof validResponse.reason).toBe('string');
    expect(validResponse.reason.length).toBeLessThanOrEqual(120);
  });

  it('rejette une réponse sans challenge_id', () => {
    const bad = { observation: 'ok', skill_id: 'x', reason: 'y' };
    expect('challenge_id' in bad).toBe(false);
  });

  it('rejette une observation trop longue (> 200 chars)', () => {
    const tooLong = 'a'.repeat(201);
    expect(tooLong.length).toBeGreaterThan(200);
  });

  it('rejette une reason trop longue (> 120 chars)', () => {
    const tooLong = 'b'.repeat(121);
    expect(tooLong.length).toBeGreaterThan(120);
  });
});

describe('AiCoachService — fallback déterministe', () => {
  it("retourne source=fallback quand il n'y a pas de défi candidat", async () => {
    // Tous les défis sont déjà validés → candidates vide → fallback "bravo"
    const svc = makeService(null);

    // On mock loadCandidates pour renvoyer []
    (svc as any).loadCandidates = jest.fn().mockResolvedValue([]);
    (svc as any).loadSkills = jest
      .fn()
      .mockResolvedValue([
        {
          skill_id: 'skill-1',
          name: 'Jointures SQL',
          status: 'not_evaluated',
          level_score: null,
          trend: null,
        },
      ]);

    const result = await svc.recommend('user-1');
    expect(result.source).toBe('fallback');
    expect(result.challenge_id).toBeNull();
  });

  it("retourne source=fallback quand l'IA renvoie null", async () => {
    const svc = makeService(null);

    const candidates = [
      { id: 'chal-easy', title: 'Défi facile', difficulty: 'easy' },
      { id: 'chal-hard', title: 'Défi dur', difficulty: 'hard' },
    ];
    (svc as any).loadCandidates = jest.fn().mockResolvedValue(candidates);
    (svc as any).loadSkills = jest
      .fn()
      .mockResolvedValue([
        {
          skill_id: 'skill-1',
          name: 'Jointures SQL',
          status: 'beginner',
          level_score: 10,
          trend: null,
        },
      ]);
    (svc as any).saveAndCache = jest
      .fn()
      .mockImplementation((_uid: string, r: any) => Promise.resolve(r));

    const result = await svc.recommend('user-1');
    expect(result.source).toBe('fallback');
    // Le fallback déterministe choisit le défi le plus facile
    expect(result.challenge_id).toBe('chal-easy');
  });

  it("retourne source=fallback quand l'IA renvoie un JSON invalide", async () => {
    // Réponse sans le champ challenge_id
    const badResponse = {
      observation: 'Bonne progression',
      skill_id: 'skill-1',
      // challenge_id absent
      reason: 'Continue !',
    };
    const svc = makeService(badResponse);

    const candidates = [{ id: 'chal-1', title: 'Test', difficulty: 'easy' }];
    (svc as any).loadCandidates = jest.fn().mockResolvedValue(candidates);
    (svc as any).loadSkills = jest
      .fn()
      .mockResolvedValue([
        {
          skill_id: 'skill-1',
          name: 'SQL',
          status: 'beginner',
          level_score: 20,
          trend: null,
        },
      ]);
    (svc as any).saveAndCache = jest
      .fn()
      .mockImplementation((_uid: string, r: any) => Promise.resolve(r));

    const result = await svc.recommend('user-2');
    expect(result.source).toBe('fallback');
  });

  it('rejette challenge_id hors liste candidate et tombe en fallback', async () => {
    // L'IA propose un challenge_id qui n'est pas dans la liste candidate
    const aiResponse = {
      observation: 'Bon niveau',
      skill_id: 'skill-1',
      challenge_id: 'HORS-LISTE', // ← pas dans candidates
      reason: 'Essaie ça',
    };
    const svc = makeService(aiResponse);

    const candidates = [
      { id: 'chal-1', title: 'Vrai défi', difficulty: 'medium' },
    ];
    (svc as any).loadCandidates = jest.fn().mockResolvedValue(candidates);
    (svc as any).loadSkills = jest
      .fn()
      .mockResolvedValue([
        {
          skill_id: 'skill-1',
          name: 'SQL',
          status: 'advanced',
          level_score: 75,
          trend: 5,
        },
      ]);
    (svc as any).saveAndCache = jest
      .fn()
      .mockImplementation((_uid: string, r: any) => Promise.resolve(r));

    const result = await svc.recommend('user-3');
    expect(result.source).toBe('fallback');
    expect(result.challenge_id).not.toBe('HORS-LISTE');
  });

  it("retourne source=ai quand l'IA répond correctement", async () => {
    const candidates = [
      { id: 'chal-valid', title: 'Bon défi', difficulty: 'medium' },
    ];
    const aiResponse = {
      observation: 'Tu progresses bien.',
      skill_id: 'skill-1',
      challenge_id: 'chal-valid',
      reason: 'Ce défi est parfait pour toi.',
    };
    const svc = makeService(aiResponse);

    (svc as any).loadCandidates = jest.fn().mockResolvedValue(candidates);
    (svc as any).loadSkills = jest
      .fn()
      .mockResolvedValue([
        {
          skill_id: 'skill-1',
          name: 'SQL',
          status: 'intermediate',
          level_score: 50,
          trend: 3,
        },
      ]);
    (svc as any).saveAndCache = jest
      .fn()
      .mockImplementation((_uid: string, r: any) => Promise.resolve(r));

    const result = await svc.recommend('user-4');
    expect(result.source).toBe('ai');
    expect(result.challenge_id).toBe('chal-valid');
    expect(result.observation).toBe('Tu progresses bien.');
  });
});

describe('AiCoachService — cache', () => {
  it("clearCache supprime l'entrée du cache", async () => {
    const svc = makeService(null);
    const cache = (svc as any).cache as Map<string, unknown>;
    cache.set('user-x', {
      result: { source: 'fallback' },
      expiresAt: Date.now() + 9999,
    });
    expect(cache.has('user-x')).toBe(true);
    svc.clearCache('user-x');
    expect(cache.has('user-x')).toBe(false);
  });
});
