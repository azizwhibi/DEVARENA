'use client';

import { useEffect, useState } from 'react';

type InstallEvent = Event & { prompt(): Promise<unknown> };
const KEY = 'devarena-install-dismissed';

function dismissed() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (dismissed() || window.matchMedia('(display-mode: standalone)').matches) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only detection
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function hide() {
    try { localStorage.setItem(KEY, '1'); } catch { /* storage unavailable */ }
    setEvent(null);
    setIos(false);
  }

  if (!event && !ios) return null;
  return (
    <aside aria-label="Install DevArena" className="arena-enter fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-primary/40 bg-card p-4 text-sm shadow-xl">
      <p className="flex-1 leading-6">{event ? 'Install DevArena for a faster, app-like experience.' : 'Install DevArena: tap Share, then “Add to Home Screen”.'}</p>
      {event && <button type="button" onClick={async () => { await event.prompt(); hide(); }} className="arena-btn min-h-11 rounded-lg bg-primary px-4 font-semibold text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Install</button>}
      <button type="button" onClick={hide} className="min-h-11 rounded-lg px-3 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Dismiss</button>
    </aside>
  );
}
