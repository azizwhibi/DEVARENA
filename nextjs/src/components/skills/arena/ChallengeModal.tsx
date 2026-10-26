'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import { useAccount } from '@/components/AccountProvider';
import { apiRequest } from '@/lib/api';
import { parseRankPromotion } from '@/lib/rankings';
import { choosePracticeQuestion } from '@/lib/practice-history';

export interface ChallengeModalProps {
  challengeId: string;
  challengeTitle?: string;
  category?: string;
  difficulty?: string;
  points?: number;
  skillId?: string;
  onClose: () => void;
  onSuccess?: (points: number) => void;
  onFailure?: (penalty: number) => void;
}
interface Question {
  question: string;
  codeSnippet: string;
  hint: string;
  options: { id: string; text: string }[];
}
interface QuestionBank {
  bank: string;
  questions: Question[];
}
function isQuestionBank(value: unknown): value is QuestionBank {
  if (
    !value ||
    typeof value !== 'object' ||
    !('bank' in value) ||
    !('questions' in value)
  )
    return false;
  if (
    typeof value.bank !== 'string' ||
    !/^[A-Z][A-Z0-9_]*_QUESTIONS$/.test(value.bank) ||
    !Array.isArray(value.questions) ||
    !value.questions.length
  )
    return false;
  const prompts = new Set<string>();
  return value.questions.every((question: unknown) => {
    if (!question || typeof question !== 'object') return false;
    const q = question as Partial<Question>;
    if (
      typeof q.question !== 'string' ||
      !q.question ||
      prompts.has(q.question) ||
      typeof q.codeSnippet !== 'string' ||
      typeof q.hint !== 'string' ||
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      q.options.length > 4
    )
      return false;
    prompts.add(q.question);
    const ids = new Set<string>();
    return q.options.every((option) => {
      if (
        !option ||
        typeof option.id !== 'string' ||
        !/^opt-[1-4]$/.test(option.id) ||
        ids.has(option.id) ||
        typeof option.text !== 'string'
      )
        return false;
      ids.add(option.id);
      return true;
    });
  });
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  challengeId,
  challengeTitle = 'DevArena technical challenge',
  category,
  difficulty = 'medium',
  points,
  onClose,
  onSuccess,
  onFailure,
}) => {
  const { account } = useAccount();
  const accountId = account?.id ?? '';
  const competitive =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      challengeId,
    );
  const identity = `${accountId}:${challengeId}`;
  const latestIdentity = useRef(identity);
  const [loaded, setLoaded] = useState<{
    identity: string;
    content: QuestionBank;
    retry: number;
  } | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [failure, setFailure] = useState<{
    identity: string;
    retry: number;
    message: string;
  } | null>(null);
  const [bankRetry, setBankRetry] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [serverSuccess, setServerSuccess] = useState<boolean | null>(null);
  const [explanation, setExplanation] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiMsg, setApiMsg] = useState<string | null>(null);
  const content =
    loaded?.identity === identity && loaded.retry === bankRetry
      ? loaded.content
      : null;
  const bankError = !competitive
    ? 'This local demo is unranked. Open a published challenge to practice.'
    : !accountId
      ? 'Sign in to load practice questions.'
      : failure?.identity === identity && failure.retry === bankRetry
        ? failure.message
        : null;

  useEffect(() => {
    latestIdentity.current = identity;
    return () => {
      latestIdentity.current = '';
    };
  }, [identity]);

  const selectQuestion = useCallback(
    (bank: QuestionBank, restart = false) => {
      const prompt = choosePracticeQuestion(
        accountId,
        bank.bank,
        bank.questions.map((q) => q.question),
        restart,
      );
      setCurrentQuestion(
        bank.questions.find((q) => q.question === prompt) ?? null,
      );
      setSelectedOption(null);
      setIsSubmitted(false);
      setServerSuccess(null);
      setExplanation('');
      setIsSubmitting(false);
      setTimeLeft(300);
      setApiMsg(null);
    },
    [accountId],
  );

  useEffect(() => {
    const controller = new AbortController();
    if (!competitive || !accountId) return () => controller.abort();
    const timeout = setTimeout(() => {
      setFailure({
        identity,
        retry: bankRetry,
        message: 'Questions took too long to load. Please retry.',
      });
      controller.abort();
    }, 10000);
    void apiRequest<unknown>(
      `/me/skills/challenges/${encodeURIComponent(challengeId)}/question-bank`,
      { signal: controller.signal },
    )
      .then((value) => {
        if (controller.signal.aborted) return;
        if (!isQuestionBank(value))
          throw new Error('Question bank unavailable.');
        selectQuestion(value);
        setLoaded({ identity, content: value, retry: bankRetry });
        setFailure(null);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setFailure({
            identity,
            retry: bankRetry,
            message: 'Questions are unavailable. Please retry.',
          });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [
    identity,
    accountId,
    challengeId,
    competitive,
    bankRetry,
    selectQuestion,
  ]);

  useEffect(() => {
    if (!content || !currentQuestion || isSubmitted) return;
    const timer = setInterval(
      () => setTimeLeft((previous) => Math.max(0, previous - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [content, currentQuestion, isSubmitted]);

  const handleSubmit = async () => {
    if (
      !content ||
      !currentQuestion ||
      !selectedOption ||
      isSubmitted ||
      isSubmitting
    )
      return;
    const submittedIdentity = identity;
    setIsSubmitting(true);
    setApiMsg(null);
    try {
      const result = await apiRequest<{
        isSuccess: boolean;
        masteryPoints: number;
        explanation?: string;
        rankReward: { awarded: boolean } | null;
      }>(`/me/skills/challenges/${encodeURIComponent(challengeId)}/attempt`, {
        method: 'POST',
        body: JSON.stringify({
          question: currentQuestion.question,
          answerId: selectedOption,
        }),
      });
      if (latestIdentity.current !== submittedIdentity) return;
      if (typeof result.isSuccess !== 'boolean')
        throw new Error('Invalid answer response.');
      setIsSubmitted(true);
      setServerSuccess(result.isSuccess);
      setExplanation(
        result.explanation ?? 'Read the documentation to learn more.',
      );
      setApiMsg(
        result.isSuccess
          ? `Correct answer! +${result.masteryPoints} Mastery Points. Your skill progress and Dev Score have been updated.`
          : 'Incorrect answer. Review the explanation and try another question. Attempt recorded.',
      );
      window.dispatchEvent(new CustomEvent('skill-progress-updated'));
      const promotion = result.rankReward?.awarded
        ? parseRankPromotion(result.rankReward)
        : null;
      if (promotion)
        window.dispatchEvent(
          new CustomEvent('rank_promoted', { detail: promotion }),
        );
      if (result.isSuccess) onSuccess?.(points ?? 10);
      else onFailure?.(0);
    } catch {
      if (latestIdentity.current === submittedIdentity)
        setApiMsg('Your answer could not be checked. Please retry.');
    } finally {
      if (latestIdentity.current === submittedIdentity) setIsSubmitting(false);
    }
  };
  const ready = !!content && !bankError;
  const isCorrect = serverSuccess === true;
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
              {category ? `${category} · ` : ''}
              {difficulty === 'easy'
                ? 'Easy'
                : difficulty === 'medium'
                  ? 'Intermediate'
                  : 'Advanced'}
            </p>
          </div>
          <div className="dialog-actions">
            {ready && currentQuestion && (
              <span className="timer">
                <WorkspaceIcon name="clock" size={16} />
                {Math.floor(timeLeft / 60)}:
                {String(timeLeft % 60).padStart(2, '0')}
              </span>
            )}
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
          {bankError ? (
            <p role="alert">{bankError}</p>
          ) : !ready ? (
            <p role="status">Loading questions…</p>
          ) : !currentQuestion ? (
            <p role="status">
              You have seen all available questions in this pool. Restart to
              practice them again.
            </p>
          ) : (
            <>
              {!isSubmitted && apiMsg && <p role="alert">{apiMsg}</p>}
              <h3>{currentQuestion.question}</h3>
              {currentQuestion.codeSnippet && (
                <pre className="code-block">
                  <code>{currentQuestion.codeSnippet}</code>
                </pre>
              )}
              <p className="question-hint">
                <WorkspaceIcon name="hint" size={16} />
                {currentQuestion.hint}
              </p>
              <div
                className="question-options"
                role="group"
                aria-label="Choose an answer"
              >
                {currentQuestion.options.map((option) => {
                  const selected = selectedOption === option.id;
                  return (
                    <button
                      type="button"
                      key={option.id}
                      className={`question-option ${selected ? (isSubmitted ? (isCorrect ? 'answer-correct' : 'answer-incorrect') : 'answer-selected') : ''}`}
                      disabled={isSubmitted || isSubmitting}
                      aria-pressed={selected}
                      onClick={() => setSelectedOption(option.id)}
                    >
                      <span className="answer-check">
                        {selected && <WorkspaceIcon name="check" size={16} />}
                      </span>
                      <span>{option.text}</span>
                      {isSubmitted && selected && isCorrect && (
                        <span className="answer-label">Correct answer</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {isSubmitted && (
                <div
                  className={`answer-result ${isCorrect ? 'result-correct' : 'result-incorrect'}`}
                  role="status"
                >
                  <h4>{isCorrect ? 'Correct answer' : 'Incorrect answer'}</h4>
                  <p>{explanation}</p>
                  {apiMsg && <p className="muted">{apiMsg}</p>}
                </div>
              )}
            </>
          )}
        </div>
        <footer className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {isSubmitted ? 'Finish' : 'Cancel'}
          </button>
          {bankError ? (
            competitive &&
            accountId && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setBankRetry((retry) => retry + 1)}
              >
                Retry questions
              </button>
            )
          ) : !ready ? null : !currentQuestion ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => content && selectQuestion(content, true)}
            >
              Restart questions
            </button>
          ) : isSubmitting ? (
            <p role="status">Checking answer…</p>
          ) : isSubmitted ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => content && selectQuestion(content)}
            >
              Next question
              <WorkspaceIcon name="arrow" size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!selectedOption}
            >
              Check answer
            </button>
          )}
        </footer>
      </section>
    </div>
  );
};
