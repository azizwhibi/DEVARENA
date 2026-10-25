'use client';

import { useEffect, useState } from 'react';

type InstallEvent = Event & {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
const KEY = 'devarena-install-dismissed-session';

function dismissed() {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (dismissed() || window.matchMedia('(display-mode: standalone)').matches)
      return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only detection
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const onInstalled = () => {
      setEvent(null);
      setIos(false);
      setError('');
    };
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function hide() {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* storage unavailable */
    }
    setEvent(null);
    setIos(false);
  }

  if (!event && !ios) return null;
  return (
    <aside aria-label="Install DevArena" className="pwa-install">
      <p className="flex-1 leading-6">
        {event
          ? 'Install DevArena for a faster, app-like experience.'
          : 'Install DevArena: tap Share, then “Add to Home Screen”.'}
      </p>
      {error && <p role="alert">{error}</p>}
      {event && (
        <button
          type="button"
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              await event.prompt();
              const choice = await event.userChoice;
              setEvent(null);
              if (choice.outcome === 'dismissed') setIos(false);
            } catch {
              setError(
                'Installation did not finish. Try again or use your browser’s install menu.',
              );
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="arena-btn min-h-11 rounded-lg bg-primary px-4 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          Install
        </button>
      )}
      <button
        type="button"
        onClick={hide}
        className="min-h-11 rounded-lg px-3 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        Dismiss
      </button>
    </aside>
  );
}
