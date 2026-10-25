'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import {
  practiceApi,
  type PracticeResult,
  type PracticeSession,
} from '@/lib/skills/practice';

export interface ChallengeModalProps {
  challengeId: string;
  challengeTitle?: string;
  problemDescription?: string;
  category?: string;
  difficulty?: string;
  points?: number;
  skillId?: string;
  onClose: () => void;
  onSuccess?: (points: number) => void;
  onFailure?: (penalty: number) => void;
}

export function ChallengeModal({
  challengeId,
  challengeTitle = 'Practice problem',
  problemDescription,
  category = 'Practice quiz',
  difficulty = 'medium',
  onClose,
}: ChallengeModalProps) {
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
  useEffect(() => {
    let active = true;
    void practiceApi
      .start(challengeId)
      .then((value) => {
        if (active) {
          setSession(value);
          setError('');
        }
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : 'Unable to load this practice question.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [challengeId, revision]);
  useEffect(() => {
    if (loading || result) return;
    const timer = window.setInterval(
      () => setTimeLeft((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [loading, result]);
  function reset() {
    setLoading(true);
    setSession(null);
    setResult(null);
    setSelectedOption(null);
    setError('');
    setTimeLeft(300);
    setRevision((value) => value + 1);
  }
  async function submit() {
    if (!session || !selectedOption || submitting || result) return;
    setSubmitting(true);
    setError('');
    try {
      const saved = await practiceApi.answer(
        challengeId,
        session.session,
        selectedOption,
      );
      setResult(saved);
      setSelectedOption(saved.selectedOptionId);
      if (saved.correct) window.dispatchEvent(new Event('practice-completed'));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Your result was not saved. Please retry.',
      );
    } finally {
      setSubmitting(false);
    }
  }
  const question = session?.question;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="modal-box challenge-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="challenge-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="challenge-dialog-title">{challengeTitle}</h2>
            <p className="challenge-subtitle">
              {category} ·{' '}
              {difficulty === 'easy'
                ? 'Easy'
                : difficulty === 'medium'
                  ? 'Intermediate'
                  : 'Advanced'}
            </p>
          </div>
          <div className="dialog-actions">
            <span className="timer">
              <WorkspaceIcon name="clock" size={16} />
              {Math.floor(timeLeft / 60)}:
              {String(timeLeft % 60).padStart(2, '0')}
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label="Close challenge"
              onClick={onClose}
            >
              <WorkspaceIcon name="close" />
            </button>
          </div>
        </header>
        <div className="modal-body question-body">
          <p className="muted">
            Practice quiz. Completion is saved separately from verified
            proficiency.
          </p>
          {error && (
            <p role="alert">
              {error}
              {!session && (
                <button className="btn btn-secondary" onClick={reset}>
                  Retry
                </button>
              )}
            </p>
          )}
          {loading ? (
            <div
              className="skeleton skeleton-panel"
              role="status"
              aria-label="Loading practice question"
            />
          ) : (
            question && (
              <>
                {problemDescription && <p>{problemDescription}</p>}
                <h3>{question.question}</h3>
                {question.codeSnippet && (
                  <pre className="code-block">
                    <code>{question.codeSnippet}</code>
                  </pre>
                )}
                <p className="question-hint">
                  <WorkspaceIcon name="hint" size={16} />
                  {question.hint}
                </p>
                <div
                  className="question-options"
                  role="group"
                  aria-label="Choose an answer"
                >
                  {question.options.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={`question-option ${result && option.id === result.correctOptionId ? 'answer-correct' : result && option.id === selectedOption ? 'answer-incorrect' : option.id === selectedOption ? 'answer-selected' : ''}`}
                      disabled={!!result || submitting}
                      aria-pressed={selectedOption === option.id}
                      onClick={() => setSelectedOption(option.id)}
                    >
                      <span className="answer-check">
                        {selectedOption === option.id && (
                          <WorkspaceIcon name="check" size={16} />
                        )}
                      </span>
                      <span>{option.text}</span>
                      {result && option.id === result.correctOptionId && (
                        <span className="answer-label">Correct answer</span>
                      )}
                    </button>
                  ))}
                </div>
                {result && (
                  <div
                    className={`answer-result ${result.correct ? 'result-correct' : 'result-incorrect'}`}
                    role="status"
                  >
                    <h4>
                      {result.correct
                        ? 'Practice completed'
                        : 'Incorrect answer'}
                    </h4>
                    <p>{result.explanation}</p>
                    <p className="muted">
                      {result.correct
                        ? 'Saved to your profile and dashboard. Your verified proficiency is unchanged.'
                        : 'Try another question. No completed problem or skill was awarded.'}
                    </p>
                  </div>
                )}
              </>
            )
          )}
        </div>
        <footer className="modal-footer">
          {result || timeLeft === 0 ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={reset}>
                Next question
                <WorkspaceIcon name="arrow" size={16} />
              </button>
              {result?.correct && (
                <Link
                  href="/profile"
                  className="btn btn-primary"
                  onClick={onClose}
                >
                  View profile
                </Link>
              )}
            </>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void submit()}
                disabled={!question || !selectedOption || submitting || loading}
              >
                {submitting ? 'Checking...' : 'Check answer'}
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}
