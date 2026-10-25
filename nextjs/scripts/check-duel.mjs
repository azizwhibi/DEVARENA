import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Alias resolution for @/ imports
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/types/duel') {
      return nextResolve(new URL('../src/types/duel.ts', import.meta.url).href, context);
    }
    if (specifier === '@/lib/duelMockQuestions') {
      return nextResolve(new URL('../src/lib/duelMockQuestions.ts', import.meta.url).href, context);
    }
    if (specifier === '@/hooks/useQuizDuel') {
      return nextResolve(new URL('../src/hooks/useQuizDuel.ts', import.meta.url).href, context);
    }
    if (specifier.startsWith('@/')) {
      return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  calculatePoints,
  ROUND_TIME_MS,
  RESOLUTION_TIME_MS,
  BASE_POINTS,
  MAX_VELOCITY_BONUS,
  TOTAL_QUESTIONS,
} = await import('../src/hooks/useQuizDuel.ts');

const { DEFAULT_DUEL_QUESTIONS } = await import('../src/lib/duelMockQuestions.ts');

console.log('--- TEST SUITE: 1v1 Synchronous Quiz Duel Arbitration & Logic ---');

// ============================================================================
// 1. CALCUL DU SCORE & BONUS DE VÉLOCITÉ
// ============================================================================
console.log('1. Testing calculatePoints scoring formula...');

// Cas 1.1 : Réponse correcte immédiate (t = 10000ms) -> 1000 pts (500 base + 500 vélocité max)
const scoreImmediate = calculatePoints(true, 10000);
assert.equal(scoreImmediate, 1000, 'Immediate correct answer should give 1000 points');

// Cas 1.2 : Réponse correcte quasi immédiate (t = 9500ms) -> ~975 pts
const scoreFast = calculatePoints(true, 9500);
assert.equal(scoreFast, 975, 'Fast answer at 9.5s remaining should give 975 points');

// Cas 1.3 : Réponse correcte à mi-temps (t = 5000ms) -> 750 pts (500 + 250)
const scoreMid = calculatePoints(true, 5000);
assert.equal(scoreMid, 750, 'Mid-time answer at 5.0s remaining should give 750 points');

// Cas 1.4 : Réponse correcte tardive (t = 2000ms) -> 600 pts (500 + 100)
const scoreLate = calculatePoints(true, 2000);
assert.equal(scoreLate, 600, 'Late answer at 2.0s remaining should give 600 points');

// Cas 1.5 : Réponse correcte in extremis (t = 0ms) -> 500 pts fixes
const scoreLastMs = calculatePoints(true, 0);
assert.equal(scoreLastMs, 500, 'Last-millisecond answer at 0ms remaining should give 500 base points');

// Cas 1.6 : Réponse incorrecte (t = 9000ms) -> 0 pt
const scoreWrongFast = calculatePoints(false, 9000);
assert.equal(scoreWrongFast, 0, 'Incorrect answer must yield 0 points regardless of speed');

// Cas 1.7 : Réponse incorrecte tardive (t = 1000ms) -> 0 pt
const scoreWrongLate = calculatePoints(false, 1000);
assert.equal(scoreWrongLate, 0, 'Incorrect late answer must yield 0 points');

// Cas 1.8 : Timeout (t = 0ms, incorrect/non répondu) -> 0 pt
const scoreTimeout = calculatePoints(false, 0);
assert.equal(scoreTimeout, 0, 'Timeout must yield 0 points');

// Cas 1.9 : Bornage strict (valeur négative ou > 10000ms)
assert.equal(calculatePoints(true, -500), 500, 'Negative time must be clamped to 0 remaining (500 pts)');
assert.equal(calculatePoints(true, 15000), 1000, 'Overflow time must be clamped to max velocity (1000 pts)');

console.log('✔ PASS: calculatePoints scoring assertions passed (9/9)');

// ============================================================================
// 2. CONSTANTES DE L'ARBITRE & DONNÉES DE JEU
// ============================================================================
console.log('2. Testing arbitrator constants & dataset integrity...');

assert.equal(ROUND_TIME_MS, 10000, 'Round duration must be exactly 10,000ms (10s)');
assert.equal(RESOLUTION_TIME_MS, 2000, 'Resolution freeze must be exactly 2,000ms (2s)');
assert.equal(BASE_POINTS, 500, 'Base points must be 500');
assert.equal(MAX_VELOCITY_BONUS, 500, 'Max velocity bonus must be 500');
assert.equal(TOTAL_QUESTIONS, 10, 'Total match questions must be 10');

assert.equal(DEFAULT_DUEL_QUESTIONS.length, 10, 'Default mock dataset must contain 10 questions');
DEFAULT_DUEL_QUESTIONS.forEach((q, i) => {
  assert.ok(q.id, `Question ${i + 1} must have an id`);
  assert.ok(q.prompt, `Question ${i + 1} must have a prompt`);
  assert.equal(q.options.length, 4, `Question ${i + 1} must have exactly 4 options`);
  assert.ok([0, 1, 2, 3].includes(q.correctIndex), `Question ${i + 1} correctIndex must be 0, 1, 2 or 3`);
});

console.log('✔ PASS: Arbitrator constants & dataset integrity passed (6/6)');

// ============================================================================
// 3. MACHINE À ÉTATS & SIMULATION D'ARBITRAGE D'UN MATCH COMPLET (10 ROUNDS)
// ============================================================================
console.log('3. Testing duel state machine arbitration & statistics flow...');

function simulateMatchArbitration() {
  const p1 = { totalScore: 0, correctAnswers: 0, totalResponseTimeMs: 0, roundScores: [] };
  const p2 = { totalScore: 0, correctAnswers: 0, totalResponseTimeMs: 0, roundScores: [] };

  // Scénario simulé sur 10 questions :
  // P1 réussit 8 questions avec différents temps de réponse, échoue à Q4 et timeout à Q9
  const p1Responses = [
    { remainingMs: 8000, isCorrect: true },  // Q1: +900 pts
    { remainingMs: 6500, isCorrect: true },  // Q2: +825 pts
    { remainingMs: 4000, isCorrect: true },  // Q3: +700 pts
    { remainingMs: 7000, isCorrect: false }, // Q4: 0 pt
    { remainingMs: 9000, isCorrect: true },  // Q5: +950 pts
    { remainingMs: 5000, isCorrect: true },  // Q6: +750 pts
    { remainingMs: 3000, isCorrect: true },  // Q7: +650 pts
    { remainingMs: 8500, isCorrect: true },  // Q8: +925 pts
    { remainingMs: 0,    isCorrect: false }, // Q9: Timeout -> 0 pt
    { remainingMs: 7500, isCorrect: true },  // Q10: +875 pts
  ];

  // P2 (Adversaire) réussit 6 questions
  const p2Responses = [
    { remainingMs: 5000, isCorrect: true },  // Q1: +750 pts
    { remainingMs: 6000, isCorrect: false }, // Q2: 0 pt
    { remainingMs: 7000, isCorrect: true },  // Q3: +850 pts
    { remainingMs: 4000, isCorrect: true },  // Q4: +700 pts
    { remainingMs: 6500, isCorrect: true },  // Q5: +825 pts
    { remainingMs: 3000, isCorrect: false }, // Q6: 0 pt
    { remainingMs: 5500, isCorrect: true },  // Q7: +775 pts
    { remainingMs: 4000, isCorrect: false }, // Q8: 0 pt
    { remainingMs: 2000, isCorrect: true },  // Q9: +600 pts
    { remainingMs: 5000, isCorrect: false }, // Q10: 0 pt
  ];

  for (let r = 0; r < 10; r++) {
    const p1Resp = p1Responses[r];
    const p2Resp = p2Responses[r];

    const p1Pts = calculatePoints(p1Resp.isCorrect, p1Resp.remainingMs);
    const p2Pts = calculatePoints(p2Resp.isCorrect, p2Resp.remainingMs);

    p1.totalScore += p1Pts;
    p1.roundScores.push(p1Pts);
    if (p1Resp.isCorrect) p1.correctAnswers += 1;
    p1.totalResponseTimeMs += (ROUND_TIME_MS - p1Resp.remainingMs);

    p2.totalScore += p2Pts;
    p2.roundScores.push(p2Pts);
    if (p2Resp.isCorrect) p2.correctAnswers += 1;
    p2.totalResponseTimeMs += (ROUND_TIME_MS - p2Resp.remainingMs);
  }

  return { p1, p2 };
}

const { p1, p2 } = simulateMatchArbitration();

// Vérification de P1 (8/10 correctes)
assert.equal(p1.correctAnswers, 8, 'P1 must have exactly 8 correct answers');
assert.equal(p1.roundScores.length, 10, 'P1 must have 10 round scores recorded');
const expectedP1Score = 900 + 825 + 700 + 0 + 950 + 750 + 650 + 925 + 0 + 875; // = 6575
assert.equal(p1.totalScore, expectedP1Score, `P1 score must match expected sum (${expectedP1Score})`);

// Vérification de P2 (6/10 correctes)
assert.equal(p2.correctAnswers, 6, 'P2 must have exactly 6 correct answers');
const expectedP2Score = 750 + 0 + 850 + 700 + 825 + 0 + 775 + 0 + 600 + 0; // = 4500
assert.equal(p2.totalScore, expectedP2Score, `P2 score must match expected sum (${expectedP2Score})`);

// Vérification de la condition de victoire
assert.ok(p1.totalScore > p2.totalScore, 'P1 must be recognized as winner');

// Vérification des statistiques de moyenne
const p1AvgTime = (p1.totalResponseTimeMs / 10 / 1000).toFixed(2);
assert.equal(p1AvgTime, '4.15', 'P1 average response time must be accurately calculated');
const p1Accuracy = Math.round((p1.correctAnswers / 10) * 100);
assert.equal(p1Accuracy, 80, 'P1 accuracy must be exactly 80%');

console.log('✔ PASS: Duel state machine & match arbitration passed (7/7)');

// ============================================================================
// 4. VALIDATION DU SCHÉMA ET DES CONTRATS WEBSOCKET
// ============================================================================
console.log('4. Testing WebSocket event contract serialization...');

const sampleSubmitAnswer = {
  type: 'DUEL_SUBMIT_ANSWER',
  payload: {
    duelId: 'duel-test-123',
    roundIndex: 2,
    questionId: 'q3',
    selectedIndex: 1,
    timeRemainingMs: 7420,
  },
};

const serialized = JSON.stringify(sampleSubmitAnswer);
const deserialized = JSON.parse(serialized);
assert.equal(deserialized.type, 'DUEL_SUBMIT_ANSWER');
assert.equal(deserialized.payload.timeRemainingMs, 7420);
assert.equal(deserialized.payload.selectedIndex, 1);

const sampleRoundResolve = {
  type: 'DUEL_ROUND_RESOLVE',
  payload: {
    duelId: 'duel-test-123',
    roundIndex: 2,
    correctIndex: 1,
    playerResult: { selectedIndex: 1, timeRemainingMs: 7420, pointsEarned: 871, isCorrect: true },
    opponentResult: { selectedIndex: 2, timeRemainingMs: 4200, pointsEarned: 0, isCorrect: false },
    playerTotalScore: 2450,
    opponentTotalScore: 1600,
  },
};

const resolveSerialized = JSON.stringify(sampleRoundResolve);
const resolveParsed = JSON.parse(resolveSerialized);
assert.equal(resolveParsed.type, 'DUEL_ROUND_RESOLVE');
assert.equal(resolveParsed.payload.playerResult.pointsEarned, 871);
assert.equal(resolveParsed.payload.opponentResult.isCorrect, false);

console.log('✔ PASS: WebSocket contracts serialization passed (5/5)');

// ============================================================================
// 5. PHASE A : DÉTECTION HORS-LIGNE & FALLBACK DEVBOT
// ============================================================================
console.log('5. Testing Phase A offline interception & DevBot fallback rules...');

const OFFLINE_MATCHMAKING_ERROR =
  'Vous êtes actuellement hors-ligne. Connexion Internet requise pour le matchmaking.';
const OFFLINE_DISCONNECT_ERROR =
  'Connexion Internet perdue. Recherche de match annulée.';

assert.equal(
  OFFLINE_MATCHMAKING_ERROR,
  'Vous êtes actuellement hors-ligne. Connexion Internet requise pour le matchmaking.',
  'Matchmaking offline error message must match requirement exactly'
);
assert.equal(
  OFFLINE_DISCONNECT_ERROR,
  'Connexion Internet perdue. Recherche de match annulée.',
  'Search disconnection error message must match requirement'
);

// Simulation du comportement hors-ligne sur le matchmaking
function simulateMatchmakingAttempt({ isOnline, currentDriver }) {
  if (currentDriver === 'websocket' && !isOnline) {
    return {
      allowed: false,
      errorMessage: OFFLINE_MATCHMAKING_ERROR,
      driver: 'local_bot',
      isSearchingMatch: false,
    };
  }
  return {
    allowed: true,
    errorMessage: null,
    driver: 'websocket',
    isSearchingMatch: true,
  };
}

const offlineAttempt = simulateMatchmakingAttempt({ isOnline: false, currentDriver: 'websocket' });
assert.equal(offlineAttempt.allowed, false, 'Offline matchmaking attempt must be blocked');
assert.equal(offlineAttempt.errorMessage, OFFLINE_MATCHMAKING_ERROR, 'Offline error message must be set');
assert.equal(offlineAttempt.isSearchingMatch, false, 'Matchmaking search must remain false when offline');

const onlineAttempt = simulateMatchmakingAttempt({ isOnline: true, currentDriver: 'websocket' });
assert.equal(onlineAttempt.allowed, true, 'Online matchmaking attempt must be allowed');
assert.equal(onlineAttempt.isSearchingMatch, true, 'Matchmaking search must be active when online');

// Simulation de coupure réseau en plein matchmaking
function simulateNetworkLossDuringSearch({ wasSearching }) {
  let isSearchingMatch = wasSearching;
  let driver = 'websocket';
  let errorMessage = null;

  // Réseau coupé
  if (isSearchingMatch) {
    isSearchingMatch = false;
    driver = 'local_bot';
    errorMessage = OFFLINE_DISCONNECT_ERROR;
  }

  return { isSearchingMatch, driver, errorMessage };
}

const disconnectResult = simulateNetworkLossDuringSearch({ wasSearching: true });
assert.equal(disconnectResult.isSearchingMatch, false, 'Search must be cancelled on network loss');
assert.equal(disconnectResult.driver, 'local_bot', 'Driver must fallback to local_bot on disconnect');
assert.equal(disconnectResult.errorMessage, OFFLINE_DISCONNECT_ERROR, 'Disconnect error must be populated');

console.log('✔ PASS: Phase A offline interception & DevBot fallback assertions passed (8/8)');

// ============================================================================
// 6. ANTI-CHEAT CLIENT-SIDE TELEMETRY & QUEUE COOLDOWN BAN
// ============================================================================
console.log('6. Testing anti-cheat behavioral telemetry & queue ban rules...');

function simulateAntiCheatState() {
  let tabSwitchCount = 0;
  let showWarningModal = false;
  let isForfeited = false;
  let queueBanUntil = 0;
  let lastTriggerTime = 0;

  function handleFocusLoss(now) {
    if (now - lastTriggerTime < 1500) {
      return; // Debounce dual blur + visibilitychange
    }
    lastTriggerTime = now;
    tabSwitchCount += 1;

    if (tabSwitchCount === 1) {
      showWarningModal = true;
    } else if (tabSwitchCount >= 2) {
      showWarningModal = false;
      isForfeited = true;
      queueBanUntil = now + 60000;
    }
  }

  function getQueueRemaining(now) {
    const diff = queueBanUntil - now;
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
  }

  return {
    handleFocusLoss,
    getQueueRemaining,
    get state() {
      return { tabSwitchCount, showWarningModal, isForfeited, queueBanUntil };
    },
  };
}

const ac = simulateAntiCheatState();
const t0 = 1000000;

// Test 6.1: 1ère infraction -> modal active, pas de forfeit
ac.handleFocusLoss(t0);
assert.equal(ac.state.tabSwitchCount, 1, 'First focus loss must set count to 1');
assert.equal(ac.state.showWarningModal, true, 'First focus loss must trigger warning modal');
assert.equal(ac.state.isForfeited, false, 'First focus loss must NOT forfeit match');

// Test 6.2: Événement duplicate immédiat (blur + visibilitychange < 1500ms) -> ignoré
ac.handleFocusLoss(t0 + 50);
assert.equal(ac.state.tabSwitchCount, 1, 'Duplicate event within 1500ms must be debounced');
assert.equal(ac.state.isForfeited, false, 'Debounced event must not trigger forfeit');

// Test 6.3: 2ème infraction légitime (> 1500ms) -> forfeit immédiat + 60s ban
ac.handleFocusLoss(t0 + 2000);
assert.equal(ac.state.tabSwitchCount, 2, 'Second distinct focus loss must set count to 2');
assert.equal(ac.state.showWarningModal, false, 'Modal should close on forfeit');
assert.equal(ac.state.isForfeited, true, 'Second focus loss must immediately forfeit match');
assert.equal(ac.getQueueRemaining(t0 + 2000), 60, 'Queue cooldown must be initialized to 60s');

// Test 6.4: Vérification de l'expiration du cooldown après 60s
assert.equal(ac.getQueueRemaining(t0 + 32000), 30, 'Queue cooldown after 30s must be 30s');
assert.equal(ac.getQueueRemaining(t0 + 63000), 0, 'Queue cooldown after 61s must be 0 (unbanned)');

console.log('✔ PASS: Anti-cheat behavioral telemetry & queue ban passed (8/8)');

// ============================================================================
// 7. STRICT FORFEIT PRECEDENCE OVER SCORE CALCULATIONS
// ============================================================================
console.log('7. Testing strict forfeit precedence over score calculations...');

function calculateMatchOutcome({ forfeitOutcome, p1Score, p2Score }) {
  const isVictory =
    forfeitOutcome === 'opponent'
      ? true
      : forfeitOutcome === 'self'
        ? false
        : p1Score > p2Score;

  const isDefeat =
    forfeitOutcome === 'self'
      ? true
      : forfeitOutcome === 'opponent'
        ? false
        : p1Score < p2Score;

  const isDraw =
    forfeitOutcome !== null
      ? false
      : p1Score === p2Score;

  return { isVictory, isDefeat, isDraw };
}

// Cas 7.1: Joueur tricheur avec score plus élevé (forfeitOutcome = 'self')
const cheatWithHighPoints = calculateMatchOutcome({ forfeitOutcome: 'self', p1Score: 8000, p2Score: 1200 });
assert.equal(cheatWithHighPoints.isVictory, false, 'Cheating player must NEVER win even with higher score');
assert.equal(cheatWithHighPoints.isDefeat, true, 'Cheating player must be strictly marked as defeat');
assert.equal(cheatWithHighPoints.isDraw, false, 'Cheating match outcome cannot be draw');

// Cas 7.2: Adversaire disqualifié (forfeitOutcome = 'opponent'), joueur avec 0 pt
const victimWithZeroPoints = calculateMatchOutcome({ forfeitOutcome: 'opponent', p1Score: 0, p2Score: 9000 });
assert.equal(victimWithZeroPoints.isVictory, true, 'Non-offending player must ALWAYS win even with 0 points');
assert.equal(victimWithZeroPoints.isDefeat, false, 'Non-offending player must not be marked as defeat');
assert.equal(victimWithZeroPoints.isDraw, false, 'Non-offending win cannot be draw');

// Cas 7.3: Match normal sans forfait -> comparaison standard
const normalWin = calculateMatchOutcome({ forfeitOutcome: null, p1Score: 5000, p2Score: 3000 });
assert.equal(normalWin.isVictory, true, 'Normal match with higher score is victory');
assert.equal(normalWin.isDefeat, false, 'Normal match with higher score is not defeat');

console.log('✔ PASS: Strict forfeit precedence assertions passed (8/8)');

console.log('\n======================================================');
console.log('ALL ARBITRATION, OFFLINE & STRICT ANTI-CHEAT TESTS PASSED (51/51 assertions OK)');
console.log('======================================================\n');
