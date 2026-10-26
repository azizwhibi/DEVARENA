import { BadRequestException } from '@nestjs/common';
import { gradeChallengeAnswer } from './challenge-grading';

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
});
