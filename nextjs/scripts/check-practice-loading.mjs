import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { choosePracticeQuestion } from '../src/lib/practice-history.ts';

const source = readFileSync(
  new URL('../src/components/skills/arena/ChallengeModal.tsx', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const question = (prompt) => ({
  question: prompt,
  codeSnippet: 'const values = [];',
  hint: 'Read the data.',
  options: [
    { id: 'opt-1', text: 'First answer' },
    { id: 'opt-2', text: 'Second answer' },
  ],
});
const bank = (name = 'SQL_QUESTIONS') => ({
  bank: name,
  questions: ['SQL first', 'SQL second', 'SQL third'].map(question),
});
let mountId = 0;
function mount(request, accountId = `test-${++mountId}`) {
  const slots = [],
    effects = [],
    timers = new Map(),
    calls = [];
  let cursor = 0,
    timerId = 0,
    dirty = false;
  const same = (a, b) =>
    a?.length === b?.length && a.every((value, i) => value === b[i]);
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === 'function' ? initial() : initial;
      return [
        slots[index],
        (value) => {
          const next =
            typeof value === 'function' ? value(slots[index]) : value;
          dirty ||= next !== slots[index];
          slots[index] = next;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      slots[index] ??= { current: initial };
      return slots[index];
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!same(slots[index]?.dependencies, dependencies)) {
        slots[index]?.cleanup?.();
        effects.push(() => {
          slots[index] = { dependencies, cleanup: effect() };
        });
      }
    },
    useCallback(callback, dependencies) {
      const index = cursor++;
      if (!same(slots[index]?.dependencies, dependencies))
        slots[index] = { dependencies, callback };
      return slots[index].callback;
    },
  };
  const jsx = (type, props) => ({ type, props });
  const sandbox = {
    exports: {},
    AbortController,
    CustomEvent,
    window: new EventTarget(),
    setInterval: () => 1,
    clearInterval() {},
    setTimeout(callback) {
      const id = ++timerId;
      timers.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === '@/components/AccountProvider')
        return { useAccount: () => ({ account: { id: accountId } }) };
      if (name === '@/lib/practice-history') return { choosePracticeQuestion };
      if (name === '@/lib/api')
        return {
          apiRequest: (...args) => {
            calls.push(args);
            return request(...args);
          },
        };
      if (name === '@/lib/rankings') return { parseRankPromotion: () => null };
      return {};
    },
  };
  vm.runInNewContext(compiled, sandbox);
  const props = {
    challengeId: '33333333-3333-4333-8333-333333333333',
    challengeTitle: 'NestJS filters',
    onClose() {},
  };
  return {
    calls,
    timers,
    props,
    render() {
      let tree,
        passes = 0;
      do {
        dirty = false;
        cursor = 0;
        tree = sandbox.exports.ChallengeModal(props);
        while (effects.length) effects.shift()();
        assert.ok(++passes < 12, 'Component effects stabilize');
      } while (dirty);
      return tree;
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.();
    },
  };
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (tree == null || typeof tree === 'boolean') return '';
  if (typeof tree !== 'object') return tree;
  return text(tree.props?.children);
}
function button(tree, label) {
  return nodes(tree).find(
    (node) => node.type === 'button' && text(node) === label,
  );
}
function prompt(tree) {
  return nodes(tree).find((node) => node.type === 'h3')?.props.children;
}
function noQuestion(tree) {
  assert.equal(prompt(tree), undefined);
  assert.ok(
    !nodes(tree).some((n) => n.props?.className?.includes('question-option')),
    'No provisional options',
  );
}
const settle = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
let resolveRequest;
const success = mount(
  () =>
    new Promise((resolve) => {
      resolveRequest = resolve;
    }),
);
assert.match(text(success.render()), /Loading questions/);
noQuestion(success.render());
assert.equal(
  success.calls[0][0],
  '/me/skills/challenges/33333333-3333-4333-8333-333333333333/question-bank',
);
resolveRequest(bank());
await settle();
let tree = success.render();
assert.match(prompt(tree), /SQL/);
assert.ok(button(tree, 'Check answer'));
assert.equal(success.timers.size, 0);
success.unmount();

let attempts = 0;
const failed = mount(async () => {
  if (++attempts === 1) throw new Error('Service unavailable');
  return bank();
});
failed.render();
await settle();
tree = failed.render();
assert.doesNotMatch(text(tree), /Loading questions/);
noQuestion(tree);
button(tree, 'Retry questions').props.onClick();
failed.render();
await settle();
tree = failed.render();
assert.ok(prompt(tree), 'Retry recovers without closing');
failed.unmount();

const stalled = mount(() => new Promise(() => {}));
stalled.render();
assert.equal(stalled.timers.size, 1);
[...stalled.timers.values()][0]();
tree = stalled.render();
assert.ok(button(tree, 'Retry questions'));
noQuestion(tree);
assert.equal(stalled.calls[0][1].signal.aborted, true);
stalled.unmount();

for (const response of [
  { bank: 'constructor' },
  { bank: 'SQL_QUESTIONS', questions: [] },
  { ...bank(), questions: [question('Duplicate'), question('Duplicate')] },
]) {
  const invalid = mount(async () => response);
  invalid.render();
  await settle();
  noQuestion(invalid.render());
  assert.ok(button(invalid.render(), 'Retry questions'));
  invalid.unmount();
}
let finishOld;
const changing = mount((path) =>
  path.includes('33333333')
    ? new Promise((resolve) => {
        finishOld = resolve;
      })
    : Promise.resolve(bank('PYTHON_QUESTIONS')),
);
changing.render();
changing.props.challengeId = '44444444-4444-4444-8444-444444444444';
changing.render();
await settle();
const newPrompt = prompt(changing.render());
finishOld({ bank: 'SQL_QUESTIONS', questions: [question('Stale prompt')] });
await settle();
assert.equal(
  prompt(changing.render()),
  newPrompt,
  'Stale challenge cannot replace current content',
);
changing.unmount();

const rotationAccount = `rotation-${++mountId}`;
const seen = [];
for (let i = 0; i < 3; i++) {
  const reopened = mount(async () => bank(), rotationAccount);
  reopened.render();
  await settle();
  seen.push(prompt(reopened.render()));
  reopened.unmount();
}
assert.equal(
  new Set(seen).size,
  3,
  'Reopening does not repeat before exhaustion',
);
const exhausted = mount(async () => bank(), rotationAccount);
exhausted.render();
await settle();
tree = exhausted.render();
noQuestion(tree);
assert.match(text(tree), /all available questions/);
button(tree, 'Restart questions').props.onClick();
tree = exhausted.render();
assert.notEqual(
  prompt(tree),
  seen.at(-1),
  'Explicit restart avoids immediate repetition',
);
exhausted.unmount();

const submission = mount(async (path, init) =>
  init?.method === 'POST'
    ? {
        isSuccess: false,
        masteryPoints: 0,
        explanation: 'Server feedback',
        rankReward: null,
      }
    : bank(),
);
submission.render();
await settle();
tree = submission.render();
button(tree, 'First answer').props.onClick();
tree = submission.render();
await button(tree, 'Check answer').props.onClick();
tree = submission.render();
assert.match(text(tree), /Incorrect answer/);
assert.match(text(tree), /Server feedback/);
assert.equal(JSON.parse(submission.calls.at(-1)[1].body).answerId, 'opt-1');
button(tree, 'Next question').props.onClick();
const next = prompt(submission.render());
assert.notEqual(
  next,
  JSON.parse(submission.calls.at(-1)[1].body).question,
  'Next rotates after server grading',
);
submission.unmount();

const rejected = mount(async (_path, init) => {
  if (init?.method === 'POST') throw new Error('Unavailable');
  return bank();
});
rejected.render();
await settle();
tree = rejected.render();
button(tree, 'First answer').props.onClick();
tree = rejected.render();
await button(tree, 'Check answer').props.onClick();
tree = rejected.render();
assert.match(text(tree), /could not be checked/);
assert.doesNotMatch(text(tree), /Incorrect answer|Correct answer!/);
assert.ok(
  button(tree, 'Check answer'),
  'Submission failure remains retryable without invented local grading',
);
rejected.unmount();
let finishSubmission;
let completedAfterClose = 0;
const closed = mount(async (_path, init) =>
  init?.method === 'POST'
    ? new Promise((resolve) => {
        finishSubmission = resolve;
      })
    : bank(),
);
closed.props.onSuccess = () => completedAfterClose++;
closed.render();
await settle();
tree = closed.render();
button(tree, 'First answer').props.onClick();
tree = closed.render();
const pendingSubmission = button(tree, 'Check answer').props.onClick();
closed.unmount();
finishSubmission({ isSuccess: true, masteryPoints: 100, rankReward: null });
await pendingSubmission;
assert.equal(
  completedAfterClose,
  0,
  'Closed challenge cannot deliver stale callbacks',
);

console.log(
  'PASS: authoritative public content, hidden fallback, retry/timeout/validation/stale cancellation, reopened rotation/exhaustion and server-only grading.',
);
