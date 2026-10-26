'use client';
import { useState } from 'react';
import { apiRequest, ApiError } from '@/lib/api';
type Explanation = {
  text: string;
  ai_generated: true;
  reviewed: false;
  truncated: boolean;
};
export function LessonExplanation({ id }: { id: string }) {
  const [value, setValue] = useState<Explanation | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function explain() {
    if (busy) return;
    setError('');
    if (!navigator.onLine) {
      setError('Reconnect to request an AI explanation.');
      return;
    }
    setBusy(true);
    try {
      setValue(
        await apiRequest<Explanation>(
          '/knowledge/resources/' + id + '/explain',
          {
            method: 'POST',
            body: JSON.stringify({ action: 'explain' }),
            signal: AbortSignal.timeout(20000),
          },
        ),
      );
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 503
          ? 'AI is unavailable. Retry later; the lesson remains available.'
          : e instanceof ApiError && e.status === 504
            ? 'AI timed out. Try again.'
            : e instanceof ApiError && e.status === 429
              ? 'AI request limit reached. Try again later.'
              : e instanceof Error &&
                  ['AbortError', 'TimeoutError'].includes(e.name)
                ? 'AI timed out. Try again.'
                : e instanceof Error
                  ? e.message
                  : 'AI unavailable. Try again later.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card knowledge-ai" aria-label="AI lesson explanation">
      <button className="btn btn-secondary" disabled={busy} onClick={explain}>
        {busy
          ? 'Explaining…'
          : error
            ? 'Retry explanation'
            : 'Explain this lesson'}
      </button>
      <p className="muted">
        Sends this published lesson to Gemini. No account details are sent.
      </p>
      {busy && <p role="status">Preparing an explanation…</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {value && (
        <div>
          <h2 className="section-title">AI-generated explanation</h2>
          <p className="muted">Not reviewed. Check it against the lesson.</p>
          <div className="knowledge-ai-text">{value.text}</div>
          {value.truncated && (
            <p className="muted">The explanation reached its length limit.</p>
          )}
        </div>
      )}
    </section>
  );
}
