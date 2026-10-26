'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { X, Send, Code2, Check, AlertCircle } from 'lucide-react';
import { codeReviewApi, languageNames, type CodeLanguage, type CodeProblem, type CodeReview } from '@/lib/skills/code-review';
import { useSkillsAccount } from '../SkillsWorkspace';
import styles from './code-review.module.css';

export function ProblemSolver({ problemId, onClose }: { problemId: string; onClose(): void }) {
  const account = useSkillsAccount();
  const dialog = useRef<HTMLDialogElement>(null);
  const [problem, setProblem] = useState<CodeProblem | null>(null);
  const [language, setLanguage] = useState<CodeLanguage>('javascript');
  const [code, setCode] = useState('');
  const [result, setResult] = useState<CodeReview | null>(null);
  const [tab, setTab] = useState<'problem' | 'code' | 'result'>('problem');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const mounted = useRef(true);
  const submitted = useRef<{ id: string; code: string; language: CodeLanguage } | null>(null);
  const draftKey = (lang: CodeLanguage) => `devarena:code-draft:${account.id}:${problemId}:${lang}`;
  useEffect(() => {
    mounted.current = true;
    dialog.current?.showModal();
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    void codeReviewApi.problem(problemId).then(value => {
      if (!active) return;
      setProblem(value); setResult(value.latest); setError('');
      const preferred = value.latest?.language ?? (/^python\s*:/i.test(value.title) ? 'python' : value.languages[0]);
      const lang = value.languages.includes(preferred) ? preferred : value.languages[0];
      setLanguage(lang);
      let draft: string | null = null;
      try { draft = sessionStorage.getItem(`devarena:code-draft:${account.id}:${problemId}:${lang}`); } catch { /* Storage can be disabled. */ }
      setCode(draft ?? (value.latest?.language === lang ? value.latest.code : ''));
    }).catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Unable to load problem.'); });
    return () => { active = false; };
  }, [account.id, problemId, revision]);
  useEffect(() => {
    if (result?.state !== 'pending') return;
    const timer = window.setInterval(() => {
      void codeReviewApi.result(result.id).then(value => {
        if (!mounted.current) return;
        setResult(value);
        if (value.state === 'completed') window.dispatchEvent(new Event('code-review-completed'));
      }).catch((e: unknown) => { if (mounted.current) setError(e instanceof Error ? e.message : 'Unable to load review.'); });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [result]);
  function updateCode(value: string) {
    setCode(value);
    try { sessionStorage.setItem(draftKey(language), value); } catch { /* The editor still works. */ }
  }
  function changeLanguage(value: CodeLanguage) {
    setLanguage(value);
    let draft: string | null = null;
    try { draft = sessionStorage.getItem(draftKey(value)); } catch { /* Storage can be disabled. */ }
    setCode(draft ?? (problem?.latest?.language === value ? problem.latest.code : ''));
  }
  async function submit() {
    if (busy || !problem || result?.state === 'pending') return;
    if (code.trim().length < 10) { setError('Enter your solution code.'); setTab('code'); return; }
    const previous = submitted.current;
    const request = previous && previous.code === code && previous.language === language && result?.state !== 'failed'
      ? previous : { id: crypto.randomUUID(), code, language };
    submitted.current = request;
    setBusy(true); setError(''); setResult(null); setTab('result');
    try {
      const value = await codeReviewApi.submit(problemId, request.id, request.language, request.code);
      if (mounted.current) {
        setResult(value);
        if (value.state === 'completed') window.dispatchEvent(new Event('code-review-completed'));
      }
    } catch (e) {
      if (mounted.current) {
        // Recover a saved outcome after a lost response before allowing another review.
        try {
          const saved = await codeReviewApi.result(request.id);
          if (mounted.current) {
            setResult(saved);
            if (saved.state === 'completed') window.dispatchEvent(new Event('code-review-completed'));
          }
        } catch { /* The original failure remains useful. */ }
        setError(e instanceof Error ? e.message : 'Unable to submit code.');
      }
    } finally { if (mounted.current) setBusy(false); }
  }
  const pending = busy || result?.state === 'pending';
  const isCurrent = result?.code === code && result?.language === language;
  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="code-problem-title" onCancel={onClose}>
      <header className={styles.header}>
        <div><span className="ui-label">Problem</span><h2 id="code-problem-title">{problem?.title ?? 'Loading problem'}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close problem"><X size={20} strokeWidth={1.5} /></button>
      </header>
      <nav className={styles.tabs} aria-label="Problem workspace">
        {(['problem', 'code', 'result'] as const).map(value => (
          <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{value === 'result' ? 'Result' : value === 'code' ? 'Code' : 'Problem'}</button>
        ))}
      </nav>
      <div className={styles.body}>
        {error && <div role="alert" className="workspace-alert">{error}{!problem && <button className="ui-button" onClick={() => setRevision(v => v + 1)}>Retry</button>}</div>}
        {!problem && !error && <div className="skeleton skeleton-panel" role="status" aria-label="Loading problem" />}
        {problem && tab === 'problem' && <section className={styles.statement}>
          <h3>Statement</h3><p>{problem.description}</p>
          <p className={styles.note}>Gemini reviews your solution. A score of {problem.threshold}% or higher marks it solved (AI-reviewed). Code is not executed.</p>
          <button className="ui-button ui-button-primary" onClick={() => setTab('code')}><Code2 size={18} strokeWidth={1.5} />Write solution</button>
        </section>}
        {problem && tab === 'code' && <section className={styles.editor}>
          <label>Language<select className="input" value={language} onChange={e => changeLanguage(e.target.value as CodeLanguage)} disabled={!!pending}>
            {problem.languages.map(value => <option key={value} value={value}>{languageNames[value]}</option>)}
          </select></label>
          <label htmlFor="solution-code">Your solution</label>
          <textarea id="solution-code" className={styles.code} value={code} onChange={e => updateCode(e.target.value)} maxLength={20000}
            spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" disabled={!!pending}
            placeholder="Write your complete solution here" />
          <span className={styles.note}>Draft saved in this browser tab. {code.length.toLocaleString('en-US')}/20,000 characters.</span>
        </section>}
        {tab === 'result' && <section className={styles.result} aria-live="polite" aria-busy={!!pending}>
          {pending ? <><div className="skeleton skeleton-title" /><h3>Gemini is reviewing your code</h3><p>You can close this window. Your result will be saved.</p></> :
           result?.state === 'completed' ? <>
            <span className={styles.pill}>AI-generated review</span>
            <h3>{result.passed ? <Check size={20} strokeWidth={1.5} /> : <AlertCircle size={20} strokeWidth={1.5} />}{result.passed ? 'Solved (AI-reviewed)' : result.assessable ? 'Needs changes' : 'Unable to assess'}</h3>
            {result.score !== null && <p className={styles.score}>{result.score}<span>% review score</span></p>}
            {!isCurrent && <p className={styles.note}>This result is for your previous submission. Submit your current code for a new review.</p>}
            <p>{result.feedback}</p>
            {result.issues.length > 0 && <ul>{result.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>}
            <p className={styles.note}>Gemini’s estimate, not a test pass rate. Verified proficiency is unchanged.</p>
            <div className={styles.actions}><button className="ui-button" onClick={() => setTab('code')}>Back to code</button>{result.passed && <Link className="ui-button" href="/profile" onClick={onClose}>View profile</Link>}</div>
          </> : <><h3>{result?.state === 'failed' ? 'Review unavailable' : 'No submission yet'}</h3><p>{result?.state === 'failed' ? 'Your problem has not been marked solved. Submit again to retry.' : 'Write your solution, then submit it for review.'}</p><button className="ui-button" onClick={() => setTab('code')}>Back to code</button></>}
        </section>}
      </div>
      <footer className={styles.footer}><span className={styles.note}>Solved at {problem?.threshold ?? 90}% · AI review</span><button className="ui-button ui-button-primary" onClick={() => void submit()} disabled={!problem || !!pending || code.trim().length < 10}><Send size={18} strokeWidth={1.5} />{pending ? 'Reviewing' : 'Submit solution'}</button></footer>
    </dialog>
  );
}
