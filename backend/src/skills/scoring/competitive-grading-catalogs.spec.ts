import { BadRequestException } from '@nestjs/common';
import { gradeChallengeAnswer } from './challenge-grading';

const catalogs = [
  [
    'SQL CTEs',
    'How can a recursive PostgreSQL CTE traverse a hierarchy with a terminating step?',
  ],
  [
    'PostgreSQL indexes',
    'Why use JOIN LATERAL instead of a correlated PostgreSQL subquery?',
  ],
  [
    'Algorithms recursion',
    'What must a recursive function have to prevent unbounded recursive calls?',
  ],
  [
    'React state',
    'Why should React state be updated through its setter rather than direct mutation?',
  ],
  [
    'Python traceback debugging',
    "How can a Python traceback help locate an exception's cause?",
  ],
  [
    'LLM code review',
    'What risk comes with importing a library suggested by an AI model?',
  ],
  [
    'Flutter widgets',
    'How do Flutter StatelessWidget and StatefulWidget differ?',
  ],
  [
    'Node asynchronous execution',
    'Why should CPU-bound work avoid blocking the Node.js event loop?',
  ],
  ['Python objects', 'How do Python __str__ and __repr__ differ?'],
  [
    'Docker images',
    'Which Dockerfile instruction supports a smaller final image in a multi-stage build?',
  ],
  [
    'TypeScript generics',
    'How do you recursively make nested object properties readonly in TypeScript?',
  ],
  [
    'NestJS filters',
    'In NestJS, how can a Global Exception Filter catch all errors and return the correct HTTP status?',
  ],
  [
    'AI prompt injection',
    'Which architecture helps reduce indirect prompt injection risk in an AI agent?',
  ],
];

describe('server grading across supported practice catalogs', () => {
  it.each(catalogs)(
    'grades correct and incorrect answers in %s',
    (title, question) => {
      expect(gradeChallengeAnswer(title, question, 'opt-1')).toBe(true);
      expect(gradeChallengeAnswer(title, question, 'opt-2')).toBe(false);
      expect(() => gradeChallengeAnswer(title, question, 'opt-4')).toThrow(
        BadRequestException,
      );
    },
  );

  it('supports the server-loaded linked skill when the challenge title is generic', () => {
    expect(
      gradeChallengeAnswer('Fundamentals', catalogs[10][1], 'opt-1', [
        'typescript',
      ]),
    ).toBe(true);
    expect(() =>
      gradeChallengeAnswer('Fundamentals', catalogs[10][1], 'opt-1', [
        'python',
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects competitive grading for titles and skills without a recognized topic', () => {
    expect(() =>
      gradeChallengeAnswer('Fundamentals', catalogs[11][1], 'opt-1', [
        'unknown subject',
      ]),
    ).toThrow(BadRequestException);
  });
});
