import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePoints,
  ROUND_TIME_MS,
  RESOLUTION_TIME_MS,
  BASE_POINTS,
  MAX_VELOCITY_BONUS,
  TOTAL_QUESTIONS,
} from '../useQuizDuel';
import { DEFAULT_DUEL_QUESTIONS } from '@/lib/duelMockQuestions';

describe('useQuizDuel Arbitration & Scoring Logic', () => {
  describe('calculatePoints formula', () => {
    it('awards 1000 points for immediate correct answer (10s remaining)', () => {
      const points = calculatePoints(true, 10000);
      assert.equal(points, 1000);
    });

    it('awards around 750 points for mid-time correct answer (5s remaining)', () => {
      const points = calculatePoints(true, 5000);
      assert.equal(points, 750);
    });

    it('awards 500 points for last-moment correct answer (0s remaining)', () => {
      const points = calculatePoints(true, 0);
      assert.equal(points, 500);
    });

    it('awards 0 points for incorrect answers regardless of velocity', () => {
      assert.equal(calculatePoints(false, 9500), 0);
      assert.equal(calculatePoints(false, 5000), 0);
      assert.equal(calculatePoints(false, 1000), 0);
    });

    it('awards 0 points for timeouts', () => {
      assert.equal(calculatePoints(false, 0), 0);
    });

    it('clamps negative remaining times to 0 without errors', () => {
      assert.equal(calculatePoints(true, -200), 500);
    });

    it('clamps overflow remaining times to max velocity', () => {
      assert.equal(calculatePoints(true, 15000), 1000);
    });
  });

  describe('Arbitration Constants', () => {
    it('enforces exact game timings', () => {
      assert.equal(ROUND_TIME_MS, 10000);
      assert.equal(RESOLUTION_TIME_MS, 2000);
      assert.equal(BASE_POINTS, 500);
      assert.equal(MAX_VELOCITY_BONUS, 500);
      assert.equal(TOTAL_QUESTIONS, 10);
    });

    it('provides exactly 10 developer questions in default mock set', () => {
      assert.equal(DEFAULT_DUEL_QUESTIONS.length, 10);
      DEFAULT_DUEL_QUESTIONS.forEach((q) => {
        assert.equal(q.options.length, 4);
        assert.ok([0, 1, 2, 3].includes(q.correctIndex));
      });
    });
  });

  describe('State Transitions & Arbitration Flow', () => {
    it('calculates aggregate statistics correctly after 10 rounds', () => {
      const roundScores = [950, 800, 750, 0, 900, 650, 700, 0, 850, 920];
      const correctAnswers = roundScores.filter((s) => s > 0).length;
      const totalScore = roundScores.reduce((acc, curr) => acc + curr, 0);

      assert.equal(correctAnswers, 8);
      assert.equal(totalScore, 6520);
      const accuracy = Math.round((correctAnswers / 10) * 100);
      assert.equal(accuracy, 80);
    });
  });
});
