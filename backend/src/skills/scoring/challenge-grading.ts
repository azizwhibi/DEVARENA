import { BadRequestException } from '@nestjs/common';

// Server answer key for the existing practice catalog; parity is checked by check-competitive-results.mjs.
type QuestionBank = [question: string, options: string[], correct: string][];
const NESTJS_QUESTIONS: QuestionBank = [
  [
    'In NestJS, how can a Global Exception Filter catch all errors and return the correct HTTP status?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'Which NestJS decorator makes a module available throughout the application without repeated imports?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'What does a NestJS Guard do, and when does it run?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How can a NestJS pipe reject empty strings with an HTTP 422 error?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How does a NestJS interceptor differ from middleware?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
];
const TYPESCRIPT_QUESTIONS: QuestionBank = [
  [
    'How do you recursively make nested object properties readonly in TypeScript?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'What is a distributive conditional type in TypeScript, and when does it apply?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How can a TypeScript type extract only object keys whose values are functions?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How do interface and type differ when declaring an object in TypeScript?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How can infer extract a function return type in a conditional type?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
];
const SQL_QUESTIONS: QuestionBank = [
  [
    'Why use JOIN LATERAL instead of a correlated PostgreSQL subquery?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'Which PostgreSQL index is suitable for JSONB containment queries using @>?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How can WITH RECURSIVE traverse an employee hierarchy with a termination condition?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How do TRUNCATE and DELETE differ in PostgreSQL performance?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How does PostgreSQL MVCC support concurrent reads?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
];
const AI_TRAP_QUESTIONS: QuestionBank = [
  [
    'Which architecture helps reduce indirect prompt injection risk in an AI agent?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'Why can LLM-generated code call nonexistent functions?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    "How can ranking tasks reduce an LLM's position bias?",
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How can an attacker use fictional roleplay to attempt to bypass model safeguards?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How should a critical production pipeline evaluate LLM output reliability?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
];
const DOCKER_QUESTIONS: QuestionBank = [
  [
    'Which Dockerfile instruction supports a smaller final image in a multi-stage build?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How can Docker Compose wait until the database is ready before starting the app?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'Which Docker command lists image layers and helps identify large layers?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
];
const PYTHON_QUESTIONS: QuestionBank = [
  [
    'How do Python __str__ and __repr__ differ?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How does the Python GIL affect the choice between multiprocessing and threading?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'What is a Python generator, and why use one for a large dataset?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
];
const FLUTTER_QUESTIONS: QuestionBank = [
  [
    'How do Flutter StatelessWidget and StatefulWidget differ?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How does ListView.builder improve long-list rendering compared with ListView?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
];
const NODEJS_QUESTIONS: QuestionBank = [
  [
    'Why should CPU-bound work avoid blocking the Node.js event loop?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How do process.nextTick() and setImmediate() differ in Node.js?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
];
const SQL_CTE_QUESTIONS: QuestionBank = [
  [
    'How can a recursive PostgreSQL CTE traverse a hierarchy with a terminating step?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'What is a main benefit of a Common Table Expression over a complex nested subquery?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How can NOT EXISTS find users who have no orders?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'When is JOIN LATERAL useful instead of a correlated scalar subquery in SELECT?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
];
const ALGORITHMS_QUESTIONS: QuestionBank = [
  [
    'What must a recursive function have to prevent unbounded recursive calls?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'What is the average lookup complexity of a hash map compared with an unsorted array?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'Which data structure uses LIFO and supports function-call execution?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'How does pipe(f, g)(x) differ from compose(f, g)(x)?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
];
const REACT_STATE_QUESTIONS: QuestionBank = [
  [
    'Why should React state be updated through its setter rather than direct mutation?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
  [
    'When is useReducer useful instead of several useState calls?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
];
const DEBUGGING_TRACEBACK_QUESTIONS: QuestionBank = [
  [
    "How can a Python traceback help locate an exception's cause?",
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
];
const AI_CODE_REVIEW_QUESTIONS: QuestionBank = [
  [
    'What risk comes with importing a library suggested by an AI model?',
    ['opt-1', 'opt-2', 'opt-3'],
    'opt-1',
  ],
];
function bankFromKeywords(text: string): QuestionBank | null {
  const t = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  // 1. Sous-requêtes, CTE, SQL
  if (
    t.includes('cte') ||
    t.includes('sous-requete') ||
    t.includes('subquer') ||
    t.includes('jointure')
  ) {
    return SQL_CTE_QUESTIONS;
  }
  if (
    t.includes('sql') ||
    t.includes('postgres') ||
    t.includes('index') ||
    t.includes('jsonb')
  ) {
    return SQL_QUESTIONS;
  }
  // 2. Algorithmes, Récursivité, Complexité, Structures de données, Assemblage
  if (
    t.includes('recursi') ||
    t.includes('complexit') ||
    t.includes('structure') ||
    t.includes('assemblage') ||
    t.includes('algo') ||
    t.includes('donnee')
  ) {
    return ALGORITHMS_QUESTIONS;
  }
  // 3. React & Gestion d'état
  if (
    t.includes('etat') ||
    t.includes('state') ||
    t.includes('react') ||
    t.includes('hook')
  ) {
    return REACT_STATE_QUESTIONS;
  }
  // 4. Debugging & Traceback
  if (
    t.includes('traceback') ||
    t.includes('trace') ||
    t.includes('debug') ||
    t.includes('lecture')
  ) {
    return DEBUGGING_TRACEBACK_QUESTIONS;
  }
  // 5. Revue de code IA & Hallucinations
  if (
    t.includes('revue') ||
    t.includes('hallucin') ||
    t.includes('inventee') ||
    t.includes('trap') ||
    t.includes('prompt') ||
    t.includes('injection') ||
    t.includes('ia') ||
    t.includes('llm')
  ) {
    return AI_CODE_REVIEW_QUESTIONS;
  }
  // 6. Flutter & Widgets
  if (
    t.includes('flutter') ||
    t.includes('widget') ||
    t.includes('composition')
  ) {
    return FLUTTER_QUESTIONS;
  }
  // 7. Node.js & Asynchrone
  if (
    t.includes('asynchrone') ||
    t.includes('promesse') ||
    t.includes('node')
  ) {
    return NODEJS_QUESTIONS;
  }
  // 8. Python
  if (t.includes('python')) {
    return PYTHON_QUESTIONS;
  }
  // 9. Docker
  if (t.includes('docker')) {
    return DOCKER_QUESTIONS;
  }
  // 10. TypeScript
  if (
    t.includes('typescript') ||
    t.includes(' ts ') ||
    t.includes('typage') ||
    t.includes('type')
  ) {
    return TYPESCRIPT_QUESTIONS;
  }
  // 11. NestJS
  if (t.includes('nest') || t.includes('microservice')) {
    return NESTJS_QUESTIONS;
  }
  return null;
}
const QUESTION_BANKS = { NESTJS_QUESTIONS, TYPESCRIPT_QUESTIONS, SQL_QUESTIONS, SQL_CTE_QUESTIONS, ALGORITHMS_QUESTIONS, REACT_STATE_QUESTIONS, DEBUGGING_TRACEBACK_QUESTIONS, AI_CODE_REVIEW_QUESTIONS, FLUTTER_QUESTIONS, NODEJS_QUESTIONS, PYTHON_QUESTIONS, DOCKER_QUESTIONS, AI_TRAP_QUESTIONS };

function trustedBanks(title: string, skills: string[]): QuestionBank[] {
  const resolve = (text: string) => /ai.trap|prompt|injection|jailbreak/i.test(text) ? AI_TRAP_QUESTIONS : bankFromKeywords(text);
  const titleBank = resolve(title);
  const banks = titleBank ? [titleBank] : skills.map(resolve).filter((bank): bank is QuestionBank => bank !== null);
  if (!banks.length) throw new BadRequestException('Competitive questions are unavailable for this challenge.');
  return banks;
}

export function getChallengeBankName(title: string, skills: string[]): string {
  const bank = trustedBanks(title, skills)[0];
  return Object.entries(QUESTION_BANKS).find(([, value]) => value === bank)![0];
}

export function gradeChallengeAnswer(
  title: string,
  question: string,
  answerId: string,
  skills: string[] = [],
): boolean {
  const banks = trustedBanks(title, skills);
  const entry = banks.flat().find((row) => row[0] === question);
  if (!entry || !entry[1].includes(answerId))
    throw new BadRequestException('Invalid challenge answer.');
  return entry[2] === answerId;
}
