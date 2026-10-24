import type { Question } from '@/types/duel';
export const DEFAULT_DUEL_QUESTIONS: Question[] = [
  {
    id: 'q1',
    prompt: 'What does this expression return in modern JavaScript?',
    snippet: 'typeof (async () => {})()',
    options: ['"function"', '"object"', '"promise"', '"undefined"'],
    correctIndex: 1,
  },
  {
    id: 'q2',
    prompt: 'In which order are these messages printed?',
    snippet: `console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');`,
    options: ['1, 2, 3, 4', '1, 4, 3, 2', '1, 4, 2, 3', '1, 3, 4, 2'],
    correctIndex: 1,
  },
  {
    id: 'q3',
    prompt: 'What does the TypeScript satisfies operator do?',
    snippet:
      'const palette = { primary: "#0070f3" } satisfies Record<string, string>;',
    options: [
      'It performs a strict type cast at runtime',
      'It validates compatibility without widening the inferred type',
      'It prevents property reassignment',
      'It bypasses the compiler with dynamic typing',
    ],
    correctIndex: 1,
  },
  {
    id: 'q4',
    prompt: 'Which JavaScript comparison returns true?',
    snippet: 'Object.is(NaN, NaN) vs (NaN === NaN)',
    options: [
      'Only NaN === NaN',
      'Only Object.is(NaN, NaN)',
      'Both return true',
      'Both return false',
    ],
    correctIndex: 1,
  },
  {
    id: 'q5',
    prompt: 'Which React function consumes a Promise during rendering?',
    snippet: 'const data = use(fetchDataPromise);',
    options: ['use()', 'usePromise()', 'useAwait()', 'useAsync()'],
    correctIndex: 0,
  },
  {
    id: 'q6',
    prompt: 'Which Flexbox property aligns items along the main axis?',
    snippet: '.container { display: flex; /* ??? */ }',
    options: ['align-items', 'justify-content', 'align-content', 'place-items'],
    correctIndex: 1,
  },
  {
    id: 'q7',
    prompt: 'What is the average key lookup complexity of a hash map?',
    snippet: 'const map = new Map(); map.get("clef");',
    options: ['O(log n)', 'O(n)', 'O(1)', 'O(n log n)'],
    correctIndex: 2,
  },
  {
    id: 'q8',
    prompt:
      'Which HTTP status indicates insufficient permissions for an authenticated user?',
    options: [
      '401 Unauthorized',
      '403 Forbidden',
      '405 Method Not Allowed',
      '422 Unprocessable Entity',
    ],
    correctIndex: 1,
  },
  {
    id: 'q9',
    prompt: 'What happens to the object after these assignments?',
    snippet: `let user = { name: "Dev" };
let admin = user;
user = null;`,
    options: [
      'The object is immediately garbage collected',
      'The object remains reachable through admin',
      'A ReferenceError is thrown',
      'The name property becomes undefined',
    ],
    correctIndex: 1,
  },
  {
    id: 'q10',
    prompt: 'Which SQL clause filters rows before GROUP BY?',
    snippet:
      'SELECT dept, count(*) FROM employees WHERE salary > 3000 GROUP BY dept HAVING count(*) > 5;',
    options: ['HAVING', 'WHERE', 'QUALIFY', 'FILTER'],
    correctIndex: 1,
  },
];
