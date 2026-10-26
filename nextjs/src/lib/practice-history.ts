type History = { seen: string[]; last: string | null };
type HistoryStorage = Pick<Storage, 'getItem' | 'setItem'>;
const memory = new Map<string, History>();

/** Store public prompt identities only; grading and answers stay on the server. */
export function choosePracticeQuestion(
  accountId: string,
  bank: string,
  prompts: string[],
  restart = false,
  storage?: HistoryStorage,
): string | null {
  const key = `devarena.practice:${encodeURIComponent(accountId)}:${encodeURIComponent(bank)}`;
  let history = memory.get(key);
  try {
    storage ??=
      typeof window === 'undefined' ? undefined : window.sessionStorage;
    if (!history) {
      const saved: unknown = JSON.parse(storage?.getItem(key) ?? 'null');
      if (
        saved &&
        typeof saved === 'object' &&
        'seen' in saved &&
        Array.isArray(saved.seen)
      ) {
        history = {
          seen: saved.seen.filter(
            (value): value is string => typeof value === 'string',
          ),
          last:
            'last' in saved && typeof saved.last === 'string'
              ? saved.last
              : null,
        };
      }
    }
  } catch {
    // Private browsing or malformed storage must not prevent practice.
  }
  history ??= { seen: [], last: null };
  if (restart) history = { seen: [], last: history.last };
  const { seen, last } = history;
  let available = [...new Set(prompts)].filter(
    (prompt) => !seen.includes(prompt),
  );
  if (restart && available.length > 1)
    available = available.filter((prompt) => prompt !== last);
  if (!available.length) return null;
  const selected = available[Math.floor(Math.random() * available.length)];
  history = { seen: [...history.seen, selected], last: selected };
  memory.set(key, history);
  try {
    storage?.setItem(key, JSON.stringify(history));
  } catch {
    // The in-memory session history still prevents repeats.
  }
  return selected;
}
