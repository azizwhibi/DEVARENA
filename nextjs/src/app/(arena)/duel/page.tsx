import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiRequest } from '@/lib/api-server';
import { DuelArena } from '@/components/duel/DuelArena';

export const metadata: Metadata = {
  title: '1v1 Duel Arena | DEVARENA',
  description: 'Synchronous real-time developer skill battle.',
  openGraph: {
    title: '1v1 Duel Arena | DEVARENA',
    description: 'Synchronous real-time developer skill battle.',
  },
};

function ArenaSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 p-12 text-center font-mono shadow-2xl backdrop-blur-md"
      aria-busy="true"
    >
      <div className="flex items-center gap-3 text-emerald-400">
        <span className="h-3 w-3 animate-ping rounded-full bg-emerald-400" />
        <span className="text-sm font-semibold tracking-wider">CHARGEMENT DE L&apos;ARÈNE 1V1...</span>
      </div>
      <p className="mt-3 text-xs text-slate-400">Initialisation du protocole synchrone et calibration du DevBot...</p>
    </div>
  );
}

async function DuelArenaContainer() {
  await connection();
  let username = 'Dev_Candidate';

  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      try {
        const profile = await apiRequest<{ username?: string }>('/me/profile');
        if (profile?.username && typeof profile.username === 'string') {
          username = profile.username;
        } else if (session.user.user_metadata?.username) {
          username = session.user.user_metadata.username;
        } else if (session.user.email) {
          username = session.user.email.split('@')[0];
        }
      } catch {
        if (session.user.user_metadata?.username) {
          username = session.user.user_metadata.username;
        } else if (session.user.email) {
          username = session.user.email.split('@')[0];
        }
      }
    }
  } catch {
    // Mode invité / offline : conservation du repli Dev_Candidate
    username = 'Dev_Candidate';
  }

  return <DuelArena playerName={username} />;
}

export default function DuelPage() {
  return (
    <main className="relative flex flex-1 flex-col px-4 py-6 md:py-10 pb-20 sm:pb-12">
      <div className="arena-grid" aria-hidden="true" />

      <div className="mx-auto w-full max-w-4xl">
        {/* Fil d'Ariane & Bouton de sortie rapide */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <Link href="/" className="hover:text-primary transition-colors">
              Accueil
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-500">Arena</span>
            <span className="text-slate-600">/</span>
            <span className="font-semibold text-emerald-400">1v1 Synchronous Duel</span>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/80 px-3 py-1.5 text-slate-300 transition-all hover:border-emerald-500/40 hover:text-white"
          >
            <span>←</span>
            <span>Quitter l&apos;arène</span>
          </Link>
        </div>

        {/* Arène de duel avec chargement en streaming Suspense */}
        <Suspense fallback={<ArenaSkeleton />}>
          <DuelArenaContainer />
        </Suspense>
      </div>
    </main>
  );
}
