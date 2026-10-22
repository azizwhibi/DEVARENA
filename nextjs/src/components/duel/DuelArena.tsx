'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Swords,
  Bot,
  Users,
  Clock3,
  Check,
  ArrowRight,
  Trophy,
  X,
} from 'lucide-react';
import { useSkillsAccount } from '@/components/skills/SkillsWorkspace';
import { useQuizDuel } from '@/hooks/useQuizDuel';
import styles from './duel.module.css';

export function DuelArena() {
  const account = useSkillsAccount();
  const {
    state: s,
    startOnline,
    startSolo,
    answer,
    leave,
    accept,
    decline,
  } = useQuizDuel(account.id, account.username);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (confirmLeave) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirmLeave]);
  const active = ['reading', 'resolution', 'proposed'].includes(s.phase);
  const finished = s.phase === 'finished';
  const win = s.winnerId === account.id,
    draw = s.winnerId === null;
  if (account.role === 'recruiter')
    return (
      <div className="page-container">
        <h1 className="page-title">Battle Code</h1>
        <div className="empty-state">
          <Swords size={20} strokeWidth={1.5} />
          <h2>Developer access required</h2>
          <p>Sign in with a developer account to play battles.</p>
        </div>
      </div>
    );
  return (
    <div className="page-container" data-tour="battle-code">
      <header className="page-header">
        <div>
          <h1 className="page-title">Battle Code</h1>
          <p className="page-subtitle">
            Ten questions. One opponent. Every second counts.
          </p>
        </div>
        {['reading', 'resolution'].includes(s.phase) && (
          <button
            className="btn btn-secondary"
            onClick={() => setConfirmLeave(true)}
          >
            <X size={16} strokeWidth={1.5} />{' '}
            Leave battle
          </button>
        )}
      </header>
      <div
        className={styles.content}
        data-guide-modal={active ? 'true' : undefined}
      >
        {s.error && (
          <p className={styles.alert} role="alert">
            {s.error}
          </p>
        )}
        {s.phase === 'idle' && (
          <>
            <div className={styles.modes}>
              <section className="ui-card">
                <span className={styles.icon}>
                  <Swords size={20} strokeWidth={1.5} />
                </span>
                <h2>Online 1v1</h2>
                <p>
                  Match with another developer. Both players confirm before the
                  first round.
                </p>
                <div className={styles.rule}>
                  <Users size={16} strokeWidth={1.5} />2 developers{' '}
                  <span>10 rounds</span>
                </div>
                <button
                  className="ui-button ui-button-primary"
                  onClick={() => void startOnline()}
                >
                  Find an opponent
                  <ArrowRight size={16} strokeWidth={1.5} />
                </button>
              </section>
              <section className="ui-card">
                <span className={styles.icon}>
                  <Bot size={20} strokeWidth={1.5} />
                </span>
                <h2>DevBot practice</h2>
                <p>
                  Practice the same timed format against a simulated opponent.
                </p>
                <div className={styles.rule}>
                  <Clock3 size={16} strokeWidth={1.5} />
                  10 seconds per question
                </div>
                <button className="ui-button" onClick={startSolo}>
                  Start practice
                  <ArrowRight size={16} strokeWidth={1.5} />
                </button>
              </section>
            </div>
            <p className={styles.note}>
              Battle points and practice results are separate from verified
              skill proficiency, XP, and Marketplace credits.
            </p>
          </>
        )}
        {(s.phase === 'connecting' || s.phase === 'searching') && (
          <section className={'ui-card ' + styles.waiting} aria-live="polite">
            <span className={styles.icon}>
              <Users size={20} strokeWidth={1.5} />
            </span>
            <h2>
              {s.phase === 'connecting'
                ? 'Connecting to Battle Code'
                : 'Finding an opponent'}
            </h2>
            <p>
              {s.phase === 'connecting'
                ? 'Checking your session.'
                : 'Waiting for another developer to join.'}
            </p>
            <div className="skeleton skeleton-line" />
            <button className="ui-button" onClick={leave}>
              Cancel search
            </button>
          </section>
        )}
        {s.phase === 'proposed' && (
          <section
            className={'ui-card ' + styles.waiting}
            aria-labelledby="battle-ready"
          >
            <span className={styles.icon}>
              <Swords size={20} strokeWidth={1.5} />
            </span>
            <p className="ui-label">Opponent found</p>
            <h2 id="battle-ready">{s.opponent.name}</h2>
            <p>Ready check · {Math.ceil(s.remaining / 1000)} seconds</p>
            <div className={styles.ready}>
              <span>
                {s.accepted ? (
                  <Check size={16} strokeWidth={1.5} />
                ) : (
                  <Clock3 size={16} strokeWidth={1.5} />
                )}{' '}
                {s.accepted ? 'You are ready' : 'Waiting for you'}
              </span>
              <span>
                {s.opponentAccepted ? 'Opponent ready' : 'Opponent confirming'}
              </span>
            </div>
            <div className={styles.actions}>
              <button className="ui-button" onClick={decline}>
                Decline
              </button>
              <button
                className="ui-button ui-button-primary"
                disabled={s.accepted || s.remaining === 0}
                onClick={accept}
              >
                {s.accepted ? 'Accepted' : 'Accept battle'}
              </button>
            </div>
          </section>
        )}
        {(s.phase === 'reading' || s.phase === 'resolution' || finished) && (
          <>
            <section className={styles.scoreboard} aria-label="Battle scores">
              <div className="ui-card">
                <span className="ui-label">You</span>
                <h2>{s.player.name}</h2>
                <strong>
                  {s.player.totalScore.toLocaleString('en-US')}
                  <small> points</small>
                </strong>
              </div>
              <span className={styles.versus}>VS</span>
              <div className="ui-card">
                <span className="ui-label">
                  {s.mode === 'solo' ? 'Simulated opponent' : 'Opponent'}
                </span>
                <h2>{s.opponent.name}</h2>
                <strong>
                  {s.opponent.totalScore.toLocaleString('en-US')}
                  <small> points</small>
                </strong>
              </div>
            </section>
            {!finished && s.question && (
              <section
                className={'ui-card ' + styles.question}
                aria-labelledby="battle-question"
              >
                <div className={styles.questionMeta}>
                  <span className="ui-label">
                    Question {s.round + 1} / {s.total}
                  </span>
                  <span
                    className={s.remaining < 3000 ? styles.urgent : styles.time}
                  >
                    <Clock3 size={16} strokeWidth={1.5} />
                    {s.phase === 'resolution'
                      ? 'Round complete'
                      : (s.remaining / 1000).toFixed(1) + 's'}
                  </span>
                </div>
                <div className={styles.timer} aria-hidden="true">
                  <span style={{ width: (s.remaining / 10000) * 100 + '%' }} />
                </div>
                <h2 id="battle-question">{s.question.prompt}</h2>
                {s.question.snippet && (
                  <pre className={styles.code}>
                    <code>{s.question.snippet}</code>
                  </pre>
                )}
                <div
                  className={styles.options}
                  role="group"
                  aria-label="Choose your answer"
                >
                  {s.question.options.map((option, index) => (
                    <button
                      key={index}
                      type="button"
                      disabled={
                        s.phase !== 'reading' ||
                        s.answer !== null ||
                        s.remaining === 0
                      }
                      aria-pressed={s.answer === index}
                      className={`${styles.option} ${s.phase === 'resolution' && s.correctIndex === index ? styles.correct : s.phase === 'resolution' && s.answer === index ? styles.incorrect : s.answer === index ? styles.selected : ''}`}
                      onClick={() => answer(index)}
                    >
                      <span>{String.fromCharCode(65 + index)}</span>
                      {option}
                      {s.phase === 'resolution' && s.correctIndex === index && (
                        <Check
                          size={18}
                          strokeWidth={1.5}
                          aria-label="Correct answer"
                        />
                      )}
                    </button>
                  ))}
                </div>
                <p className={styles.answerStatus} role="status">
                  {s.phase === 'resolution'
                    ? s.rounds.at(-1)?.player.isCorrect
                      ? 'Correct · +' +
                        s.rounds.at(-1)!.player.pointsEarned +
                        ' points'
                      : 'No points this round'
                    : s.answer !== null
                      ? 'Answer submitted. Waiting for resolution.'
                      : s.opponentAnswered
                        ? 'Your opponent has answered.'
                        : 'Choose one answer.'}
                </p>
              </section>
            )}
            {finished && (
              <section className={'ui-card ' + styles.results}>
                <Trophy
                  size={20}
                  strokeWidth={1.5}
                  className={styles.resultIcon}
                />
                <p className="ui-label">
                  {s.mode === 'solo' ? 'Practice complete' : 'Battle complete'}
                </p>
                <h2>
                  {draw
                    ? 'A draw'
                    : win
                      ? 'You win'
                      : s.opponent.name + ' wins'}
                </h2>
                <dl className={styles.resultStats}>
                  {[s.player, s.opponent].map((p, i) => (
                    <div key={i}>
                      <dt>{p.name}</dt>
                      <dd>
                        {p.correctAnswers} / {p.roundScores.length} correct
                      </dd>
                      <dd>
                        {p.roundScores.length
                          ? Math.round(
                              (p.correctAnswers / p.roundScores.length) * 100,
                            )
                          : 0}
                        % accuracy
                      </dd>
                      <dd>
                        {p.roundScores.length
                          ? (
                              p.totalResponseTimeMs /
                              p.roundScores.length /
                              1000
                            ).toFixed(2)
                          : '—'}
                        s average response
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className={styles.actions}>
                  <button className="ui-button" onClick={leave}>
                    Back to Battle Code
                  </button>
                  <button
                    className="ui-button ui-button-primary"
                    onClick={() =>
                      s.mode === 'solo' ? startSolo() : void startOnline()
                    }
                  >
                    {s.mode === 'solo'
                      ? 'Practice again'
                      : 'Find another opponent'}
                  </button>
                </div>
              </section>
            )}
            {!!s.rounds.length && (
              <section className="ui-card">
                <h2 className="section-title">Round results</h2>
                <div className="table-card">
                  <table>
                    <thead>
                      <tr>
                        <th>Round</th>
                        <th>Your points</th>
                        <th>Opponent points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.rounds.map((r, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{r.player.pointsEarned}</td>
                          <td>{r.opponent.pointsEarned}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
      <dialog
        ref={dialog}
        className={styles.leaveDialog}
        data-guide-modal="true"
        aria-labelledby="leave-battle-title"
        onCancel={() => setConfirmLeave(false)}
      >
        <h2 id="leave-battle-title">Leave this battle?</h2>
        <p>
          {s.mode === 'online'
            ? 'Leaving an active battle counts as a forfeit.'
            : 'Your practice session will end.'}
        </p>
        <div className={styles.actions}>
          <button className="ui-button" onClick={() => setConfirmLeave(false)}>
            Keep playing
          </button>
          <button
            className="ui-button ui-button-primary"
            onClick={() => {
              setConfirmLeave(false);
              leave();
            }}
          >
            Leave battle
          </button>
        </div>
      </dialog>
    </div>
  );
}
