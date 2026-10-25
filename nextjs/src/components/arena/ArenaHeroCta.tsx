'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function ArenaHeroCta() {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const isOnline = useNetworkStatus();

  if (!isExpanded) {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="group relative flex items-center gap-2.5 rounded-xl border border-primary bg-primary px-6 py-3 font-mono text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(34,197,94,0.35)] transition-all hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] active:scale-[0.98]"
        >
          <span className="text-base transition-transform group-hover:scale-110">⚡</span>
          <span>Entrer dans l&apos;Arène 1v1 (Beta)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/80 p-5 font-mono shadow-2xl backdrop-blur-md transition-all duration-300 ease-out animate-in fade-in zoom-in-95">
      {/* En-tête du sélecteur de mode */}
      <div className="flex w-full items-center justify-between border-b border-white/10 pb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wider text-slate-200">
            SÉLECTIONNEZ LE MODE DE DUEL
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
        >
          <span>✕</span>
          <span>Retour</span>
        </button>
      </div>

      {/* Alerte si réseau déconnecté */}
      {!isOnline && (
        <div className="w-full rounded-lg border border-amber-500/40 bg-amber-950/40 p-2.5 text-center text-xs text-amber-200">
          <span className="font-bold">⚠️ Mode Hors-ligne détecté</span>
          <span className="ml-1 text-amber-300/80">
            — Le multijoueur en ligne est suspendu. Entraînez-vous contre le DevBot.
          </span>
        </div>
      )}

      {/* Boutons des deux modes */}
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Bouton 1 : Mode Multijoueur en Ligne (1v1) */}
        {isOnline ? (
          <Link
            href="/duel?mode=online"
            className="group relative flex flex-col items-start gap-1 rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/70 via-slate-900/80 to-teal-950/70 p-4 text-left shadow-lg transition-all duration-300 ease-out hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] active:scale-[0.98]"
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-xl">🌐</span>
              <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                1V1 EN DIRECT
              </span>
            </div>
            <span className="mt-2 text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
              Mode Multijoueur en Ligne (1v1)
            </span>
            <span className="text-[11px] text-slate-400 leading-snug">
              Affrontez un développeur en temps réel avec arbitrage serveur.
            </span>
          </Link>
        ) : (
          <div
            className="relative flex flex-col items-start gap-1 rounded-xl border border-white/5 bg-slate-900/30 p-4 text-left opacity-40 cursor-not-allowed pointer-events-none select-none transition-all duration-300 ease-out"
            title="Connexion requise (Hors-ligne)"
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-xl">🌐</span>
              <span className="rounded bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                Connexion requise (Hors-ligne)
              </span>
            </div>
            <span className="mt-2 text-sm font-bold text-slate-400">
              Mode Multijoueur en Ligne (1v1)
            </span>
            <span className="text-[11px] text-slate-500 leading-snug">
              Indisponible sans connexion Internet.
            </span>
          </div>
        )}

        {/* Bouton 2 : Mode Hors-Ligne (vs DevBot) */}
        <Link
          href="/duel?mode=offline"
          className={`group relative flex flex-col items-start gap-1 rounded-xl p-4 text-left transition-all duration-300 ease-out active:scale-[0.98] ${
            !isOnline
              ? 'border-2 border-amber-400 bg-gradient-to-br from-amber-950/80 via-slate-900 to-purple-950/80 shadow-[0_0_30px_rgba(251,191,36,0.45)] animate-pulse'
              : 'border border-purple-500/40 bg-gradient-to-br from-purple-950/70 via-slate-900/80 to-indigo-950/70 shadow-lg hover:border-purple-400 hover:shadow-[0_0_25px_rgba(168,85,247,0.35)]'
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-xl">🤖</span>
            {!isOnline ? (
              <span className="rounded bg-amber-400/20 border border-amber-400/60 px-1.5 py-0.5 text-[10px] font-black text-amber-300">
                Recommandé Hors-Ligne
              </span>
            ) : (
              <span className="rounded bg-purple-500/20 border border-purple-500/40 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                DEVBOT SOLO
              </span>
            )}
          </div>
          <span
            className={`mt-2 text-sm font-bold transition-colors ${
              !isOnline
                ? 'text-amber-200'
                : 'text-slate-100 group-hover:text-purple-300'
            }`}
          >
            Mode Hors-Ligne (vs DevBot)
          </span>
          <span className="text-[11px] text-slate-400 leading-snug">
            {!isOnline
              ? 'Entraînement 100% autonome et immédiat contre le bot local.'
              : 'Entraînement instantané sans file d’attente ni latence.'}
          </span>
        </Link>
      </div>
    </div>
  );
}
