import { BadRequestException } from '@nestjs/common';
import {
  getChallengeBankName,
  getChallengeQuestionBank,
  QUESTION_BANKS,
  gradeChallengeAnswer,
} from './challenge-grading';

const prompt =
  'In NestJS, how can a Global Exception Filter catch all errors and return the correct HTTP status?';

describe('competitive challenge grading', () => {
  it('grades the submitted answer against the server catalog', () => {
    expect(
      gradeChallengeAnswer('NestJS exception filters', prompt, 'opt-1'),
    ).toBe(true);
    expect(
      gradeChallengeAnswer('NestJS exception filters', prompt, 'opt-2'),
    ).toBe(false);
  });

  it('rejects invented questions, unknown answer ids and questions for another skill', () => {
    expect(() => gradeChallengeAnswer('NestJS', 'I passed', 'opt-1')).toThrow(
      BadRequestException,
    );
    expect(() => gradeChallengeAnswer('NestJS', prompt, 'opt-99')).toThrow(
      BadRequestException,
    );
    expect(() => gradeChallengeAnswer('SQL indexes', prompt, 'opt-1')).toThrow(
      BadRequestException,
    );
  });

  it('rejects an unrelated default question for a generic challenge linked to SQL', () => {
    expect(() => gradeChallengeAnswer('Expert challenge', prompt, 'opt-1', ['SQL postgres indexing'])).toThrow(BadRequestException);
    expect(() => gradeChallengeAnswer('Unmapped challenge', prompt, 'opt-1', ['Rust borrow checker'])).toThrow(BadRequestException);
  });

  it('uses a recognized stored category only after title and linked skill banks', () => {
    expect(getChallengeBankName('Generic', [], 'SQL')).toBe('SQL_QUESTIONS');
    expect(getChallengeBankName('NestJS filters', [], 'SQL')).toBe(
      'NESTJS_QUESTIONS',
    );
    expect(getChallengeBankName('Generic', ['NestJS'], 'SQL')).toBe(
      'NESTJS_QUESTIONS',
    );
    expect(() => getChallengeBankName('Generic', [], 'Unmapped')).toThrow(
      BadRequestException,
    );
    expect(() =>
      gradeChallengeAnswer('Generic', prompt, 'opt-1', [], 'SQL'),
    ).toThrow(BadRequestException);
  });
  it.each([
    ['Arrays', 'ARRAYS_QUESTIONS'], ['Strings', 'STRINGS_QUESTIONS'],
    ['Hash Tables', 'HASH_TABLES_QUESTIONS'], ['Two Pointers', 'TWO_POINTERS_QUESTIONS'],
    ['Sliding Window', 'SLIDING_WINDOW_QUESTIONS'], ['Binary Search', 'BINARY_SEARCH_QUESTIONS'],
    ['Stacks', 'STACKS_QUESTIONS'], ['Monotonic Stack', 'MONOTONIC_STACK_QUESTIONS'],
    ['Monotonic Queue', 'MONOTONIC_QUEUE_QUESTIONS'], ['Intervals', 'INTERVALS_QUESTIONS'],
    ['Matrices', 'MATRICES_QUESTIONS'], ['Breadth-First Search', 'BFS_QUESTIONS'],
    ['Prefix Sum', 'PREFIX_SUM_QUESTIONS'], ['Trees', 'TREES_QUESTIONS'],
    ['Graphs', 'GRAPHS_QUESTIONS'], ['Topological Sort', 'TOPOLOGICAL_QUESTIONS'],
    ['Shortest Path', 'SHORTEST_PATH_QUESTIONS'], ['Minimum Spanning Tree', 'MST_QUESTIONS'],
    ['Dynamic Programming', 'DYNAMIC_PROGRAMMING_QUESTIONS'],
    ['SQL Filtering', 'SQL_FILTERING_QUESTIONS'], ['SQL Aggregation', 'SQL_AGGREGATION_QUESTIONS'],
    ['SQL Joins', 'SQL_JOINS_QUESTIONS'], ['SQL Window Functions', 'SQL_WINDOW_QUESTIONS'],
    ['SQL Subqueries', 'SQL_SUBQUERIES_QUESTIONS'], ['SQL Dates', 'SQL_DATES_QUESTIONS'],
  ])('resolves the relevant published category %s', (category, expected) => {
    expect(getChallengeBankName('Generic challenge', [], category)).toBe(expected);
  });

  it('recognizes JavaScript and Ruby without defaulting to an unrelated topic', () => {
    expect(getChallengeBankName('JavaScript: First Matching Pair', ['Hash tables'])).toBe('JAVASCRIPT_QUESTIONS');
    expect(getChallengeBankName('Ruby: Transform Values with a Block', ['Ruby blocks'])).toBe('RUBY_QUESTIONS');
  });

  it('does not resolve accidental keyword substrings or identifiers', () => {
    expect(() => getChallengeBankName('Median of a sample', [], 'Unmapped')).toThrow(BadRequestException);
    expect(() => getChallengeBankName('Generic', ['00000000-0000-4000-8000-000000000cte'])).toThrow(BadRequestException);
  });

  it('refines a generic SQL title using its linked subject', () => {
    expect(getChallengeBankName('SQL: Customers Without Orders', ['SQL subqueries', 'sql-subqueries']))
      .toBe('SQL_SUBQUERIES_QUESTIONS');
  });

  it('has a unique playable pool and one authoritative answer per question', () => {
    for (const bank of Object.values(QUESTION_BANKS)) {
      expect(bank.length).toBeGreaterThanOrEqual(2);
      expect(new Set(bank.map((question) => question.question)).size).toBe(bank.length);
      for (const question of bank) {
        expect(question.options.filter((option) => option.isCorrect)).toHaveLength(1);
        expect(new Set(question.options.map((option) => option.id)).size).toBe(question.options.length);
      }
    }
  });

  it('uses the same source for displayed public questions and their grading', () => {
    const result = getChallengeQuestionBank('Generic challenge', [], 'Stacks');
    for (const question of result.questions) {
      const matching = QUESTION_BANKS[result.bank].find((row) => row.question === question.question)!;
      for (const option of question.options) {
        expect(gradeChallengeAnswer('Generic challenge', question.question, option.id, [], 'Stacks'))
          .toBe(matching.options.find((answer) => answer.id === option.id)!.isCorrect);
      }
    }
  });

  it('rejects inherited object property names as unknown subjects', () => {
    expect(() => getChallengeBankName('constructor', [], 'constructor')).toThrow(BadRequestException);
  });

  it('keeps the catalog category ahead of incidental linked topics', () => {
    expect(getChallengeBankName('Best Single Stock Trade', ['Go error handling', 'Arrays'], 'Arrays'))
      .toBe('ARRAYS_QUESTIONS');
    expect(getChallengeBankName('Median Across Two Ordered Arrays', ['Binary search'], 'Binary Search'))
      .toBe('BINARY_SEARCH_QUESTIONS');
  });

});
