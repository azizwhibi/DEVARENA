import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { choosePracticeQuestion } from '../src/lib/practice-history.ts';

const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};
const prompts = ['First', 'Second', 'Third'];
const choose = (account, bank, questions = prompts, restart = false) =>
  choosePracticeQuestion(account, bank, questions, restart, storage);

const first = choose('alice', 'pool');
const second = choose('alice', 'pool');
const third = choose('alice', 'pool');
assert.equal(
  new Set([first, second, third]).size,
  3,
  'No repeats before exhaustion across modal instances',
);
assert.equal(
  choose('alice', 'pool'),
  null,
  'Exhaustion requires explicit restart',
);
assert.notEqual(
  choose('alice', 'pool', prompts, true),
  third,
  'Restart avoids the last question',
);
assert.ok(choose('bob', 'pool'), 'Another account has independent history');
assert.ok(choose('alice', 'other'), 'Another pool has independent history');
assert.equal(choose('alice', 'singleton', ['Only']), 'Only');
assert.equal(
  choose('alice', 'singleton', ['Only']),
  null,
  'Singleton exhausts without repeating',
);
assert.equal(choose('alice', 'empty', []), null);
assert.equal(choose('alice', 'duplicates', ['Only', 'Only']), 'Only');
assert.equal(choose('alice', 'duplicates', ['Only', 'Only']), null);

const denied = {
  getItem() {
    throw new Error('Blocked');
  },
  setItem() {
    throw new Error('Blocked');
  },
};
const deniedFirst = choosePracticeQuestion(
  'alice',
  'denied',
  prompts,
  false,
  denied,
);
assert.notEqual(
  choosePracticeQuestion('alice', 'denied', prompts, false, denied),
  deniedFirst,
  'Storage denial falls back to session memory',
);

const malformed = { getItem: () => '{bad', setItem() {} };
assert.ok(
  choosePracticeQuestion('alice', 'malformed', prompts, false, malformed),
);
assert.ok(
  [...values.values()].every(
    (value) => !value.includes('answerId') && !value.includes('token'),
  ),
  'History contains only public question identifiers',
);
const freshModule = { exports: {}, window: { sessionStorage: storage } };
vm.runInNewContext(
  ts.transpileModule(
    readFileSync(
      new URL('../src/lib/practice-history.ts', import.meta.url),
      'utf8',
    ),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  ).outputText,
  freshModule,
);
const previousHistory = JSON.parse(values.get('devarena.practice:alice:pool'));
const restored = freshModule.exports.choosePracticeQuestion(
  'alice',
  'pool',
  prompts,
);
assert.ok(
  !previousHistory.seen.includes(restored),
  'A fresh route module restores sessionStorage history',
);

console.log(
  'PASS: practice pool/session/account isolation, exhaustion, restart, singleton, duplicates and storage failures.',
);
