import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
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

// The compact server answer key must match every existing practice question.
const modal = readFileSync(
  new URL('../src/components/skills/arena/ChallengeModal.tsx', import.meta.url),
  'utf8',
);
const bankSource = modal.slice(
  modal.indexOf('interface QuestionOption'),
  modal.indexOf('function pickRandom'),
);
const names = [
  ...bankSource.matchAll(/const (\w+_QUESTIONS): Question\[\]/g),
].map((match) => match[1]);
assert.equal(names.length, 13);
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(
  ts.transpileModule(
    bankSource + '\nglobalThis.banks = {' + names.join(',') + '};',
    {},
  ).outputText,
  sandbox,
);
const keySource = readFileSync(
  new URL(
    '../../backend/src/skills/scoring/challenge-grading.ts',
    import.meta.url,
  ),
  'utf8',
);
const keySandbox = {
  require: createRequire(
    new URL('../../backend/package.json', import.meta.url),
  ),
  exports: {},
};
vm.createContext(keySandbox);
vm.runInContext(
  ts.transpileModule(
    keySource + '\nglobalThis.banks = {' + names.join(',') + '};',
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  keySandbox,
);
for (const name of names) {
  const answers = sandbox.banks[name].map((question) => [
    question.question,
    question.options.map((option) => option.id),
    question.options.find((option) => option.isCorrect).id,
  ]);
  assert.equal(
    JSON.stringify(keySandbox.banks[name]),
    JSON.stringify(answers),
    `${name} answer key stays synchronized`,
  );
}
assert.match(modal, /masteryPoints/);
assert.match(modal, /rank_promoted/);
console.log(
  'PASS: matching-match Elo results, stale/solo rejection, reset and complete practice answer-key parity.',
);
