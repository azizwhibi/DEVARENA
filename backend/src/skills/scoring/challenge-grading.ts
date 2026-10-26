import { BadRequestException } from '@nestjs/common';
import { QUESTION_BANKS } from './practice-questions';

export { QUESTION_BANKS } from './practice-questions';

const CATEGORY_BANKS: Record<string, string> = {
  arrays: 'ARRAYS_QUESTIONS', strings: 'STRINGS_QUESTIONS',
  'hash tables': 'HASH_TABLES_QUESTIONS', 'two pointers': 'TWO_POINTERS_QUESTIONS',
  'sliding window': 'SLIDING_WINDOW_QUESTIONS', 'sliding windows': 'SLIDING_WINDOW_QUESTIONS',
  'binary search': 'BINARY_SEARCH_QUESTIONS', stacks: 'STACKS_QUESTIONS',
  'monotonic stack': 'MONOTONIC_STACK_QUESTIONS', 'monotonic stacks': 'MONOTONIC_STACK_QUESTIONS',
  'monotonic queue': 'MONOTONIC_QUEUE_QUESTIONS', 'monotonic queues': 'MONOTONIC_QUEUE_QUESTIONS',
  intervals: 'INTERVALS_QUESTIONS', matrices: 'MATRICES_QUESTIONS',
  'breadth first search': 'BFS_QUESTIONS', 'prefix sum': 'PREFIX_SUM_QUESTIONS', 'prefix sums': 'PREFIX_SUM_QUESTIONS',
  trees: 'TREES_QUESTIONS', graphs: 'GRAPHS_QUESTIONS',
  'topological sort': 'TOPOLOGICAL_QUESTIONS', 'topological sorting': 'TOPOLOGICAL_QUESTIONS',
  'shortest path': 'SHORTEST_PATH_QUESTIONS', 'shortest paths': 'SHORTEST_PATH_QUESTIONS',
  'minimum spanning tree': 'MST_QUESTIONS', 'minimum spanning trees': 'MST_QUESTIONS',
  'dynamic programming': 'DYNAMIC_PROGRAMMING_QUESTIONS',
  'sql filtering': 'SQL_FILTERING_QUESTIONS', 'sql aggregation': 'SQL_AGGREGATION_QUESTIONS',
  'sql joins': 'SQL_JOINS_QUESTIONS', 'sql window functions': 'SQL_WINDOW_QUESTIONS',
  'sql subqueries': 'SQL_SUBQUERIES_QUESTIONS', 'sql dates': 'SQL_DATES_QUESTIONS',
};

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}

function bankFromKeywords(text: string): string | undefined {
  const t = normalize(text);
  const subjectBank = (Object.hasOwn(CATEGORY_BANKS, t) ? CATEGORY_BANKS[t] : undefined) ?? Object.entries(CATEGORY_BANKS)
    .find(([subject]) => t === `${subject} ${subject}`)?.[1];
  if (subjectBank) return subjectBank;
  if (/\b(ai trap|prompt|injection|jailbreak)\b/.test(t)) return 'AI_TRAP_QUESTIONS';
  if (/\b(ctes?|sous requetes?|subqueries|jointures?)\b/.test(t)) return 'SQL_CTE_QUESTIONS';
  if (/\b(sql|postgres(?:ql)?|indexes?|index|jsonb)\b/.test(t)) return 'SQL_QUESTIONS';
  if (/\b(algorithms?|algorithmes?|recursi\w*|complexit\w*|structures?|assemblage|donnees?)\b/.test(t)) return 'ALGORITHMS_QUESTIONS';
  if (/\b(etat|state|react|hooks?)\b/.test(t)) return 'REACT_STATE_QUESTIONS';
  if (/\b(tracebacks?|trace|debug\w*|lecture)\b/.test(t)) return 'DEBUGGING_TRACEBACK_QUESTIONS';
  if (/\b(revue|hallucin\w*|inventee|ia|ai|llm)\b/.test(t)) return 'AI_CODE_REVIEW_QUESTIONS';
  if (/\b(flutter|widgets?|composition)\b/.test(t)) return 'FLUTTER_QUESTIONS';
  if (/\b(node(?:js)?|asynchrone|asynchronous|promesses?)\b/.test(t)) return 'NODEJS_QUESTIONS';
  if (/\b(python)\b/.test(t)) return 'PYTHON_QUESTIONS';
  if (/\b(docker)\b/.test(t)) return 'DOCKER_QUESTIONS';
  if (/\b(typescript|ts|typage|types?)\b/.test(t)) return 'TYPESCRIPT_QUESTIONS';
  if (/\b(nest(?:js)?|microservices?)\b/.test(t)) return 'NESTJS_QUESTIONS';
  if (/\b(javascript)\b/.test(t)) return 'JAVASCRIPT_QUESTIONS';
  if (/\b(ruby)\b/.test(t)) return 'RUBY_QUESTIONS';
  return undefined;
}

export function getChallengeBankName(
  title: string,
  skills: string[],
  category?: string,
): string {
  const titleBank = bankFromKeywords(title);
  const normalizedCategory = category ? normalize(category) : '';
  const categoryBank = Object.hasOwn(CATEGORY_BANKS, normalizedCategory) ? CATEGORY_BANKS[normalizedCategory] : undefined;
  // A specific catalog category refines a generic SQL title, while explicit
  // language/framework titles retain their subject. Category wins over incidental linked skills.
  if (categoryBank && (!titleBank || titleBank === 'SQL_QUESTIONS')) return categoryBank;
  if (titleBank === 'SQL_QUESTIONS') {
    const subject = skills.map(bankFromKeywords).find((bank) => bank?.startsWith('SQL_') && bank !== 'SQL_QUESTIONS');
    if (subject) return subject;
  }
  if (titleBank) return titleBank;
  for (const skill of skills) {
    const bank = bankFromKeywords(skill);
    if (bank) return bank;
  }
  const fallback = category ? bankFromKeywords(category) : undefined;
  if (fallback) return fallback;
  throw new BadRequestException('Competitive questions are unavailable for this challenge.');
}

export function getChallengeQuestionBank(title: string, skills: string[], category?: string) {
  const bank = getChallengeBankName(title, skills, category);
  const questions = QUESTION_BANKS[bank].map(({ question, codeSnippet, hint, options }) => ({
    question, codeSnippet, hint,
    options: options.map(({ id, text }) => ({ id, text })),
  }));
  return { bank, questions };
}

function findAnswer(title: string, question: string, answerId: string, skills: string[], category?: string) {
  const bank = getChallengeBankName(title, skills, category);
  const entry = QUESTION_BANKS[bank].find((row) => row.question === question);
  const answer = entry?.options.find((option) => option.id === answerId);
  if (!answer) throw new BadRequestException('Invalid challenge answer.');
  return answer;
}

export function gradeChallengeAnswer(
  title: string, question: string, answerId: string, skills: string[] = [], category?: string,
): boolean {
  return findAnswer(title, question, answerId, skills, category).isCorrect;
}

export function getChallengeAnswerExplanation(
  title: string, question: string, answerId: string, skills: string[] = [], category?: string,
): string {
  return findAnswer(title, question, answerId, skills, category).explanation;
}
