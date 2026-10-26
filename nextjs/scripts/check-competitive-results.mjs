import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { initialBattle, receiveBattle } from '../src/lib/duelState.ts';

let state = { ...initialBattle('Alice'), duelId: 'match', phase: 'finished' };
const rating = {
  duelId: 'match',
  delta: 28,
  rating: 1228,
  competitivePoints: 1512,
};
state = receiveBattle(
  state,
  { type: 'DUEL_RATING_UPDATED', payload: rating },
  'alice',
  0,
);
assert.deepEqual(
  state.ratingUpdate,
  rating,
  'Displays the server rating update',
);
const stale = receiveBattle(
  state,
  { type: 'DUEL_RATING_UPDATED', payload: { ...rating, duelId: 'old' } },
  'alice',
  0,
);
assert.strictEqual(stale, state, 'Ignores rating updates for another match');
const solo = { ...state, mode: 'solo' };
assert.strictEqual(
  receiveBattle(
    solo,
    { type: 'DUEL_RATING_UPDATED', payload: rating },
    'alice',
    0,
  ),
  solo,
);
assert.equal(
  initialBattle('Alice').ratingUpdate,
  null,
  'A new match clears prior rating results',
);

// Every practice question now has one canonical server-owned content/answer source.
const modal = readFileSync(new URL('../src/components/skills/arena/ChallengeModal.tsx', import.meta.url), 'utf8');
const contentSource = readFileSync(new URL('../../backend/src/skills/scoring/practice-questions.ts', import.meta.url), 'utf8');
const contentSandbox = { exports: {} };
vm.runInNewContext(ts.transpileModule(contentSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, contentSandbox);
const banks = contentSandbox.exports.QUESTION_BANKS;
for (const original of ['NESTJS', 'TYPESCRIPT', 'SQL', 'SQL_CTE', 'ALGORITHMS', 'REACT_STATE', 'DEBUGGING_TRACEBACK', 'AI_CODE_REVIEW', 'FLUTTER', 'NODEJS', 'PYTHON', 'DOCKER', 'AI_TRAP']) {
  assert.ok(banks[original + '_QUESTIONS'], original + ' content is retained');
}
for (const [name, questions] of Object.entries(banks)) {
  assert.ok(questions.length >= 2, name + ' has rotation alternatives');
  assert.equal(new Set(questions.map((q) => q.question)).size, questions.length, name + ' prompts are unique');
  for (const question of questions) {
    assert.equal(question.options.filter((option) => option.isCorrect).length, 1, name + ' has exactly one answer');
    assert.equal(new Set(question.options.map((option) => option.id)).size, question.options.length);
    assert.ok(question.options.every((option) => /^opt-[1-4]$/.test(option.id)));
  }
}
assert.doesNotMatch(modal, /isCorrect:\s*(true|false)|const \w+_QUESTIONS/, 'Browser no longer embeds a second answer bank');
assert.match(modal, /masteryPoints/);
assert.match(modal, /rank_promoted/);

// Exercise profile rendering and the duel completion effect without a browser.
function loadComponent(path, mocks, extra = '') {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(new URL(path, import.meta.url), 'utf8') + extra,
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      exports: module.exports,
      require: (name) => {
        if (name === 'react/jsx-runtime')
          return {
            jsx: (type, props) => ({ type, props }),
            jsxs: (type, props) => ({ type, props }),
          };
        if (name in mocks) return mocks[name];
        throw new Error('Unexpected module: ' + name);
      },
      window: mocks.window,
      Event,
      AbortController,
      setTimeout,
      clearTimeout,
    },
  );
  return module.exports;
}
const profileHeader = loadComponent(
  '../src/components/profile/ProfileHeader.tsx',
  {
    '@/components/marketplace/EquippedBadge': {},
    'lucide-react': {},
    'next/link': {},
    '@/lib/countries': { getCountryName: () => null },
    './ProfileProgress': {},
  },
);
const profileTree = JSON.stringify(
  profileHeader.ProfileHeader({
    profile: {
      username: 'Alice',
      role: 'developer',
      technologies: [],
      devScore: 40,
      tier: 'Intermediate',
      competitivePoints: 1334,
      competitiveTier: 'Silver',
      duelRating: 1224,
    },
  }),
);
assert.match(profileTree, /Competitive points/);
assert.match(profileTree, /1334/);
assert.match(profileTree, /1224/);
const effects = [];
let refreshes = 0;
const browser = new EventTarget();
let updates = 0;
browser.addEventListener('profile-score-updated', () => updates++);
const battle = { ...state, phase: 'finished', mode: 'online' };
const arena = loadComponent('../src/components/duel/DuelArena.tsx', {
  react: {
    useEffect: (effect) => effects.push(effect),
    useRef: () => ({ current: null }),
    useState: () => [false, () => {}],
  },
  'next/navigation': { useRouter: () => ({ refresh: () => refreshes++ }) },
  'lucide-react': {},
  '@/components/skills/SkillsWorkspace': {
    useSkillsAccount: () => ({ id: 'alice', role: 'developer' }),
  },
  '@/hooks/useQuizDuel': { useQuizDuel: () => ({ state: battle }) },
  './duel.module.css': { default: {} },
  window: browser,
});
arena.DuelArena();
effects.forEach((effect) => effect());
assert.equal(
  updates,
  1,
  'Accepted server rating updates refresh the shared account',
);
assert.equal(
  refreshes,
  1,
  'Accepted server rating updates invalidate prefetched profile data',
);
effects.length = 0;
battle.ratingUpdate = null;
arena.DuelArena();
effects.forEach((effect) => effect());
assert.equal(
  updates,
  1,
  'No profile refresh before authoritative rating persistence',
);
const accountEffects = [];
const values = [];
const requests = [];
const accountBrowser = new EventTarget();
let slot = 0;
const accountModule = loadComponent(
  '../src/components/AccountProvider.tsx',
  {
    react: {
      createContext: () => ({}),
      useEffect: (effect) => accountEffects.push(effect),
      useState: (initial) => {
        const index = slot++;
        values[index] = initial;
        return [
          initial,
          (value) => {
            values[index] =
              typeof value === 'function' ? value(values[index]) : value;
          },
        ];
      },
    },
    '@/hooks/useAuth': { useAuth: () => ({ user: { id: 'alice' } }) },
    '@/lib/api': {
      ApiError: class extends Error {},
      apiRequest: () =>
        new Promise((resolve, reject) => requests.push({ resolve, reject })),
    },
    window: accountBrowser,
  },
  '\nexports.testAccountState = useAccountState;',
);
accountModule.testAccountState();
const cleanupAccount = accountEffects[0]();
accountBrowser.dispatchEvent(new Event('profile-score-updated'));
requests[1].resolve({ id: 'alice', competitivePoints: 1334 });
await new Promise(setImmediate);
requests[0].resolve({ id: 'alice', competitivePoints: 1200 });
await new Promise(setImmediate);
assert.equal(
  values[0].competitivePoints,
  1334,
  'An older initial response cannot overwrite the updated score',
);
accountBrowser.dispatchEvent(new Event('profile-score-updated'));
requests[2].reject(new Error('offline'));
await new Promise(setImmediate);
assert.equal(
  values[0].competitivePoints,
  1334,
  'Failed background score refresh preserves the current profile',
);
assert.equal(
  values[1],
  null,
  'Failed background refresh does not replace the battle with an account error',
);
cleanupAccount();

const rankingsBoard = loadComponent(
  '../src/components/rankings/RankingsBoard.tsx',
  {
    'next/image': () => null,
    'lucide-react': { Trophy: () => null },
    '@/lib/countries': { getCountryName: () => 'France' },
    './rankings.module.css': { default: {} },
  },
);

const tableTree = JSON.stringify(
  rankingsBoard.RankingsTable({
    items: [
      {
        userId: 'alice',
        rank: 1,
        username: 'alice',
        avatarUrl: null,
        country: 'FR',
        institution: 'DevArena',
        devScore: 85,
        tier: 'Gold',
        division: 'II',
        competitivePoints: 1650,
        duelRating: 1350,
        wins: 10,
        matchesPlayed: 12,
        winRate: 83.3,
      },
    ],
  }),
);
assert.match(tableTree, /1,650/);
assert.match(tableTree, /Gold/);

const myStandingTree = JSON.stringify(
  rankingsBoard.MyStanding({
    me: {
      userId: 'alice',
      rank: 1,
      username: 'alice',
      avatarUrl: null,
      country: 'FR',
      institution: 'DevArena',
      devScore: 85,
      tier: 'Gold',
      division: 'II',
      competitivePoints: 1650,
      duelRating: 1350,
      wins: 10,
      matchesPlayed: 12,
      winRate: 83.3,
      eligible: true,
      pointsToNextTier: 150,
      nextTier: 'Platinum',
      nextTierReward: 1000,
      tierProgress: 50,
    },
  }),
);
assert.match(myStandingTree, /1,650/);
assert.match(myStandingTree, /Platinum/);
console.log(
  'PASS: matching-match Elo results, stale/solo rejection, reset and canonical practice content integrity.',
);
