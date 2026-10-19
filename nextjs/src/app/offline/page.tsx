export const metadata = { title: 'Offline | DevArena' };

export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <section className="arena-enter w-full max-w-md rounded-2xl border border-zinc-800 bg-card p-7 text-center sm:p-10">
        <p className="font-mono text-4xl text-accent" aria-hidden="true">$ offline_</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">You’re offline</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">The arena needs a connection. Reconnect and we’ll pick up where you left off.</p>
      </section>
    </main>
  );
}
