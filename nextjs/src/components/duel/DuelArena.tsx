'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import type { Question, PlayerStats, PlayerRoundResult, DuelDriverType } from '@/types/duel';
import { useQuizDuel, ROUND_TIME_MS } from '@/hooks/useQuizDuel';
import { DEFAULT_DUEL_QUESTIONS } from '@/lib/duelMockQuestions';

export interface DuelArenaProps {
  questions?: Question[];
  playerName?: string;
  opponentName?: string;
  initialDriver?: DuelDriverType;
  onFinish?: (finalStats: { player: PlayerStats; opponent: PlayerStats }) => void;
  className?: string;
}

interface RoundHistoryItem {
  questionIndex: number;
  playerResult: PlayerRoundResult;
  opponentResult: PlayerRoundResult;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export function DuelArena({
  questions = DEFAULT_DUEL_QUESTIONS,
  playerName = 'Dev_Candidate',
  opponentName = 'DevBot_Rival',
  initialDriver = 'websocket',
  onFinish,
  className = '',
}: DuelArenaProps) {
  const [roundHistory, setRoundHistory] = useState<RoundHistoryItem[]>([]);

  const handleRoundComplete = useCallback(
    (round: {
      questionIndex: number;
      playerResult: PlayerRoundResult;
      opponentResult: PlayerRoundResult;
    }) => {
      setRoundHistory((prev) => [...prev, round]);
    },
    []
  );

  const {
    duelState,
    currentQuestionIndex,
    currentQuestion,
    totalQuestions,
    timeRemainingMs,
    playerRoundResult,
    opponentRoundResult,
    playerStats,
    opponentStats,
    isPlayerAnswered,
    isOpponentAnswered,
    answerQuestion,
    restartDuel,
    driver,
    setDriver,
    isSearchingMatch,
    searchDurationSeconds,
    queuePosition,
    errorMessage,
    cancelSearch,
    startMatchmaking,

    // Ready Check (PHASE confirmation mutuelle)
    isMatchProposed,
    hasAcceptedMatch,
    hasOpponentAccepted,
    matchAcceptTimeRemainingMs,
    proposedOpponent,
    acceptMatch,
    declineMatch,
  } = useQuizDuel({
    questions,
    playerName,
    opponentName,
    driver: initialDriver,
    onRoundComplete: handleRoundComplete,
    onFinish,
  });

  const handleRestart = useCallback(() => {
    setRoundHistory([]);
    restartDuel();
  }, [restartDuel]);

  const handleSwitchToBot = useCallback(() => {
    setRoundHistory([]);
    cancelSearch();
    setDriver('local_bot');
    restartDuel();
  }, [cancelSearch, setDriver, restartDuel]);

  const handleSwitchToMatchmaking = useCallback(() => {
    setRoundHistory([]);
    startMatchmaking();
  }, [startMatchmaking]);

  // Calcul du temps restant formaté (ex: 07.4s)
  const seconds = (timeRemainingMs / 1000).toFixed(1);
  const formattedTime = timeRemainingMs < 10000 ? `0${seconds}s` : `${seconds}s`;

  // Progression de la jauge (100% -> 0%)
  const progressPercent = Math.max(0, Math.min(100, (timeRemainingMs / ROUND_TIME_MS) * 100));

  // Couleur de la jauge selon l'urgence
  const gaugeColorClass =
    progressPercent > 50
      ? 'from-emerald-500 to-green-400'
      : progressPercent > 20
        ? 'from-amber-500 to-yellow-400'
        : 'from-rose-600 to-red-500 animate-pulse';

  // Couleur du chrono textuel selon l'urgence
  const chronoColorClass =
    progressPercent > 50
      ? 'text-emerald-400'
      : progressPercent > 20
        ? 'text-amber-400'
        : 'text-rose-500 animate-pulse font-bold';

  // Formatage du round actuel (ex: QUESTION 03/10)
  const roundNum = String(currentQuestionIndex + 1).padStart(2, '0');
  const totalNum = String(totalQuestions).padStart(2, '0');

  // Détermination du résultat final
  const isVictory = playerStats.totalScore > opponentStats.totalScore;
  const isDefeat = playerStats.totalScore < opponentStats.totalScore;
  const isDraw = playerStats.totalScore === opponentStats.totalScore;

  // Calculs statistiques
  const playerAccuracy =
    totalQuestions > 0 ? Math.round((playerStats.correctAnswers / totalQuestions) * 100) : 0;
  const opponentAccuracy =
    totalQuestions > 0 ? Math.round((opponentStats.correctAnswers / totalQuestions) * 100) : 0;

  const playerAvgResponseTime =
    totalQuestions > 0 ? (playerStats.totalResponseTimeMs / totalQuestions / 1000).toFixed(2) : '0.00';
  const opponentAvgResponseTime =
    totalQuestions > 0
      ? (opponentStats.totalResponseTimeMs / totalQuestions / 1000).toFixed(2)
      : '0.00';

  // Formatage du chrono de recherche en matchmaking (ex: 00:14)
  const searchMin = String(Math.floor(searchDurationSeconds / 60)).padStart(2, '0');
  const searchSec = String(searchDurationSeconds % 60).padStart(2, '0');

  return (
    <div
      className={`mx-auto flex w-full max-w-4xl flex-col rounded-2xl border border-white/10 bg-slate-950/80 p-4 font-sans text-slate-100 shadow-2xl backdrop-blur-md md:p-8 ${className}`}
    >
      {/* ======================================================== */}
      {/* 1. HEADER DU TERMINAL & SÉLECTEUR DE MODE               */}
      {/* ======================================================== */}
      <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5">
        {/* Barre style terminal */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="ml-2 font-semibold tracking-wider text-slate-300">
              DEVARENA :: 1V1 SYNCHRONOUS PROTOCOL
            </span>
          </div>

          <div className="flex items-center gap-2">
            {driver === 'websocket' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-300">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                ARBITRAGE SERVEUR ACTIF [:3000]
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-950/60 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-purple-300">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                MODE ENTRAÎNEMENT DEVBOT
              </span>
            )}

            <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-slate-300">
              {isSearchingMatch && 'MATCHMAKING EN COURS'}
              {!isSearchingMatch && duelState === 'READING' && 'LIVE COMBAT'}
              {!isSearchingMatch && duelState === 'RESOLUTION' && 'RESOLUTION FROZEN'}
              {!isSearchingMatch && duelState === 'FINISHED' && 'MATCH TERMINATED'}
            </span>
          </div>
        </div>

        {/* Bannière de message d'erreur ou d'alerte */}
        {errorMessage && (
          <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-950/50 p-3 text-xs font-mono text-amber-200">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={handleRestart}
              className="rounded bg-amber-500/20 px-2 py-1 text-amber-300 hover:bg-amber-500/30"
            >
              Recommencer
            </button>
          </div>
        )}

        {/* Sélecteur de mode en haut d'arène */}
        {!isSearchingMatch && duelState !== 'FINISHED' && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-slate-900/40 px-3 py-2 text-xs font-mono">
            <span className="text-slate-400">Mode de jeu sélectionné :</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSwitchToMatchmaking}
                className={`rounded-md px-3 py-1 font-semibold transition-all ${
                  driver === 'websocket'
                    ? 'border border-emerald-500/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                    : 'border border-white/10 bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                🌐 Multijoueur en Ligne (1v1)
              </button>
              <button
                type="button"
                onClick={handleSwitchToBot}
                className={`rounded-md px-3 py-1 font-semibold transition-all ${
                  driver === 'local_bot'
                    ? 'border border-purple-500/60 bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                    : 'border border-white/10 bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                🤖 DevBot Solo
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* READY CHECK : CONFIRMATION MUTUELLE AVANT LE DUEL        */}
        {/* ======================================================== */}
        {isMatchProposed ? (
          <div className="my-6 relative overflow-hidden rounded-2xl border border-emerald-500/50 bg-gradient-to-b from-slate-900 via-slate-950 to-zinc-950 p-6 md:p-8 font-mono shadow-[0_0_50px_rgba(16,185,129,0.15)] backdrop-blur-xl">
            {/* Lueurs d'arrière-plan */}
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

            {/* En-tête Ready Check */}
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-4 py-1.5 text-xs font-bold text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>MATCH TROUVÉ ! CONFIRMATION REQUISE</span>
              </div>
              <h3 className="mt-3 text-xl font-black tracking-wider text-slate-100 sm:text-2xl">
                ACCEPTEZ-VOUS CE DUEL ?
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Les deux joueurs doivent confirmer dans le délai imparti pour lancer la manche 1.
              </p>
            </div>

            {/* Compteur 10s et barre de progression */}
            <div className="my-6 text-center relative z-10">
              <div className="inline-block rounded-2xl border border-zinc-700 bg-zinc-900/90 px-6 py-3 shadow-inner">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Temps restant pour confirmer
                </div>
                <div
                  className={`text-3xl font-black tracking-widest transition-colors ${
                    matchAcceptTimeRemainingMs <= 3000
                      ? 'text-rose-500 animate-pulse'
                      : matchAcceptTimeRemainingMs <= 6000
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {(matchAcceptTimeRemainingMs / 1000).toFixed(1)}s
                </div>
              </div>

              {/* Barre de décompte */}
              <div className="mx-auto mt-3 h-2 max-w-md overflow-hidden rounded-full bg-zinc-800 border border-zinc-700">
                <div
                  className={`h-full transition-all duration-100 ${
                    matchAcceptTimeRemainingMs <= 3000
                      ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                      : matchAcceptTimeRemainingMs <= 6000
                      ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                      : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (matchAcceptTimeRemainingMs / 10000) * 100))}%` }}
                />
              </div>
            </div>

            {/* Confrontation Face-à-Face */}
            <div className="relative z-10 grid grid-cols-1 gap-4 md:grid-cols-3 items-center rounded-xl border border-white/10 bg-slate-900/80 p-5 shadow-lg">
              {/* Joueur (Vous) */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Votre profil
                </span>
                <span className="mt-1 text-base font-bold text-slate-100">{playerName}</span>
                <div className="mt-2">
                  {hasAcceptedMatch ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-950/70 px-3 py-1 text-xs font-semibold text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      VOUS ÊTES PRÊT !
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/50 px-3 py-1 text-xs font-medium text-amber-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      En attente de votre clic
                    </span>
                  )}
                </div>
              </div>

              {/* VS Emblem */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-500/60 bg-emerald-950/80 font-black text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-sm">
                  VS
                </div>
              </div>

              {/* Adversaire */}
              <div className="flex flex-col items-center md:items-end text-center md:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Adversaire trouvé
                </span>
                <span className="mt-1 text-base font-bold text-slate-100">
                  {proposedOpponent?.name || opponentStats.name}
                </span>
                <div className="mt-2">
                  {hasOpponentAccepted ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-950/70 px-3 py-1 text-xs font-semibold text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      L&apos;ADVERSAIRE EST PRÊT !
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-ping" />
                      En attente de confirmation...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Boutons d'Action */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <button
                type="button"
                onClick={acceptMatch}
                disabled={hasAcceptedMatch}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-black tracking-wider transition-all shadow-xl active:scale-95 ${
                  hasAcceptedMatch
                    ? 'border border-emerald-500/60 bg-emerald-950/80 text-emerald-200 cursor-default shadow-[0_0_25px_rgba(16,185,129,0.2)]'
                    : 'border border-emerald-400 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                }`}
              >
                {hasAcceptedMatch ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>PRÊT - EN ATTENTE DE L&apos;ADVERSAIRE...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ ACCEPTER LE MATCH</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={declineMatch}
                className="w-full sm:w-auto rounded-xl border border-rose-500/40 bg-rose-950/40 px-6 py-3 text-xs font-bold text-rose-300 transition-all hover:border-rose-500 hover:bg-rose-900/60 active:scale-95"
              >
                ✕ REFUSER
              </button>
            </div>
          </div>
        ) : isSearchingMatch ? (
          <div className="my-6 flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950 p-8 text-center font-mono shadow-2xl">
            {/* Animation Radar */}
            <div className="relative mb-6 flex h-40 w-40 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full border border-emerald-500/20" />
              <div className="absolute inset-4 rounded-full border border-emerald-500/30 bg-emerald-950/20" />
              <div className="absolute inset-10 rounded-full border border-emerald-500/40" />
              <div className="absolute inset-16 rounded-full border border-emerald-500/60" />
              <div className="absolute h-1 w-full bg-emerald-500/10" />
              <div className="absolute h-full w-1 bg-emerald-500/10" />
              <div className="absolute inset-0 animate-spin rounded-full border-t-2 border-emerald-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]" />
              <span className="relative z-10 text-2xl font-black text-emerald-400 animate-pulse">
                ⚡
              </span>
            </div>

            <h3 className="text-lg font-black tracking-wider text-emerald-400 md:text-xl">
              RECHERCHE D&apos;UN ADVERSAIRE EN LIGNE...
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Connexion établie à la passerelle WebSocket (Port 3000)
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs">
              <div className="rounded-lg border border-white/10 bg-slate-900/80 px-4 py-2">
                <span className="text-slate-400">TEMPS ÉCOULÉ : </span>
                <span className="font-bold text-emerald-300">
                  {searchMin}:{searchSec}
                </span>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-900/80 px-4 py-2">
                <span className="text-slate-400">POSITION FILE : </span>
                <span className="font-bold text-emerald-300">
                  #{queuePosition ?? 1}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={cancelSearch}
                className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-5 py-2.5 text-xs font-bold text-rose-300 transition-all hover:bg-rose-900/50 hover:border-rose-500 active:scale-95"
              >
                ✕ Annuler la recherche
              </button>
              <button
                type="button"
                onClick={handleSwitchToBot}
                className="rounded-xl border border-purple-500/40 bg-purple-950/40 px-5 py-2.5 text-xs font-bold text-purple-300 transition-all hover:bg-purple-900/50 hover:border-purple-500 active:scale-95"
              >
                🤖 Jouer immédiatement contre le DevBot
              </button>
            </div>
          </div>
        ) : (
          /* Header de confrontation 3 colonnes pendant le match */
          <div className="grid grid-cols-1 items-center gap-4 rounded-xl border border-white/5 bg-slate-900/60 p-4 md:grid-cols-3">
            {/* Côté gauche : Joueur */}
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-950/50 text-xs font-mono font-bold text-emerald-300">
                  P1
                </span>
                <span className="font-mono text-sm font-bold text-slate-100">{playerStats.name}</span>
              </div>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-black text-emerald-400">
                  {playerStats.totalScore.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">PTS</span>
              </div>
              <div className="mt-1">
                {isPlayerAnswered ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-0.5 text-xs font-mono font-medium text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    RÉPONSE VALIDÉE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/30 px-2.5 py-0.5 text-xs font-mono font-medium text-amber-300">
                    <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-400" />
                    EN RÉFLEXION...
                  </span>
                )}
              </div>
            </div>

            {/* Centre : Round et Chrono */}
            <div className="flex flex-col items-center justify-center text-center">
              <span className="rounded-full border border-white/10 bg-slate-800/80 px-3 py-1 font-mono text-xs font-semibold tracking-wider text-slate-300">
                QUESTION {roundNum}/{totalNum}
              </span>
              <span className={`my-1 font-mono text-4xl font-black tracking-tight ${chronoColorClass}`}>
                {formattedTime}
              </span>
              <span className="text-[11px] font-mono tracking-wide text-slate-400">
                {duelState === 'RESOLUTION' ? 'GEL DU SCORE' : 'TEMPS RESTANT'}
              </span>
            </div>

            {/* Côté droit : Adversaire (Humain ou DevBot) */}
            <div className="flex flex-col items-start gap-1 md:items-end">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-100">{opponentStats.name}</span>
                {driver === 'websocket' ? (
                  <span className="flex h-7 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/50 px-2 text-xs font-mono font-bold text-cyan-300">
                    RIVAL 1V1
                  </span>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-500/40 bg-rose-950/50 text-xs font-mono font-bold text-rose-300">
                    BOT
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-black text-rose-400">
                  {opponentStats.totalScore.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">PTS</span>
              </div>
              <div className="mt-1">
                {isOpponentAnswered ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-0.5 text-xs font-mono font-medium text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    RÉPONSE VALIDÉE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/30 px-2.5 py-0.5 text-xs font-mono font-medium text-amber-300">
                    <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-400" />
                    EN RÉFLEXION...
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Jauge de temps horizontale */}
        {!isSearchingMatch && (
          <div className="relative h-2.5 w-full overflow-hidden rounded-full border border-white/10 bg-slate-900/90 shadow-inner">
            <div
              className={`h-full bg-gradient-to-r transition-[width] duration-75 ease-linear ${gaugeColorClass}`}
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. ZONE DE JEU : QUESTION & OPTIONS                      */}
      {/* ======================================================== */}
      {!isSearchingMatch && duelState !== 'FINISHED' && currentQuestion && (
        <div className="flex flex-col gap-6">
          {/* Bloc Question */}
          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-5 shadow-lg">
            <h2 className="text-lg font-semibold leading-relaxed text-slate-100 md:text-xl">
              {currentQuestion.prompt}
            </h2>

            {/* Snippet de code optionnel */}
            {currentQuestion.snippet && (
              <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-700/60 bg-slate-950 p-4 font-mono text-xs text-emerald-300 leading-relaxed shadow-inner">
                <code>{currentQuestion.snippet}</code>
              </pre>
            )}
          </div>

          {/* Grille des 4 options de réponse */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {currentQuestion.options.map((optionText, index) => {
              const isSelectedByPlayer = playerRoundResult?.selectedIndex === index;
              const isCorrectAnswer = currentQuestion.correctIndex === index;
              const isResolutionPhase = duelState === 'RESOLUTION';

              let buttonStyles =
                'border-white/10 bg-slate-900/60 text-slate-200 hover:border-emerald-500/50 hover:bg-slate-800/80 hover:text-white';
              let badgeStyles = 'border-white/20 bg-slate-800 text-slate-300';

              if (isResolutionPhase) {
                if (isCorrectAnswer) {
                  // Bonne réponse révélée (vert éclatant)
                  buttonStyles =
                    'border-emerald-500 bg-emerald-950/60 text-emerald-200 shadow-[0_0_20px_rgba(34,197,94,0.35)] ring-1 ring-emerald-400';
                  badgeStyles = 'border-emerald-400 bg-emerald-500 text-slate-950 font-black';
                } else if (isSelectedByPlayer && !playerRoundResult?.isCorrect) {
                  // Mauvaise réponse choisie par le joueur (rouge/rose)
                  buttonStyles =
                    'border-rose-500 bg-rose-950/60 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.35)] ring-1 ring-rose-400';
                  badgeStyles = 'border-rose-400 bg-rose-500 text-white font-black';
                } else {
                  // Option non sélectionnée et incorrecte
                  buttonStyles = 'border-white/5 bg-slate-950/40 text-slate-500 opacity-60';
                  badgeStyles = 'border-white/10 bg-slate-900 text-slate-600';
                }
              } else if (isSelectedByPlayer) {
                // Phase de lecture, joueur a cliqué
                buttonStyles =
                  'border-emerald-500/80 bg-emerald-950/50 text-emerald-200 ring-2 ring-emerald-500/40 shadow-lg';
                badgeStyles = 'border-emerald-400 bg-emerald-500 text-slate-950 font-black';
              }

              return (
                <button
                  key={`option-${currentQuestion.id}-${OPTION_LETTERS[index]}`}
                  type="button"
                  disabled={isPlayerAnswered || isResolutionPhase}
                  onClick={() => answerQuestion(index)}
                  className={`group relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-150 ${buttonStyles} ${
                    isPlayerAnswered || isResolutionPhase ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-bold transition-colors ${badgeStyles}`}
                  >
                    {OPTION_LETTERS[index]}
                  </span>
                  <span className="text-sm font-medium leading-relaxed">{optionText}</span>

                  {/* Badge discret de sélection en phase de lecture */}
                  {isSelectedByPlayer && !isResolutionPhase && (
                    <span className="absolute right-3 top-3 rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                      CHOISI
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Résumé intermédiaire du round pendant le gel de 2s */}
          {duelState === 'RESOLUTION' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/90 p-4 font-mono text-xs shadow-lg animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">RÉSULTAT DU ROUND :</span>
                {playerRoundResult?.isCorrect ? (
                  <span className="font-bold text-emerald-400">
                    EXCELLENT (+{playerRoundResult.pointsEarned} pts en{' '}
                    {((ROUND_TIME_MS - playerRoundResult.timeRemainingMs) / 1000).toFixed(2)}s)
                  </span>
                ) : (
                  <span className="font-bold text-rose-400">
                    INCORRECT (0 pt)
                  </span>
                )}
              </div>

              {opponentRoundResult && (
                <div className="flex items-center gap-2 text-slate-400">
                  <span>{opponentStats.name} :</span>
                  <span className="font-bold text-slate-200">
                    +{opponentRoundResult.pointsEarned} pts
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ÉCRAN POST-MORTEM (FIN DE MATCH)                      */}
      {/* ======================================================== */}
      {duelState === 'FINISHED' && (
        <div className="flex flex-col gap-8 py-2">
          {/* Bannière de résultat percutante */}
          <div
            className={`flex flex-col items-center justify-center rounded-2xl border p-6 text-center shadow-2xl ${
              isVictory
                ? 'border-emerald-500/60 bg-gradient-to-b from-emerald-950/80 to-slate-950 shadow-[0_0_50px_rgba(34,197,94,0.25)]'
                : isDefeat
                  ? 'border-rose-500/60 bg-gradient-to-b from-rose-950/80 to-slate-950 shadow-[0_0_50px_rgba(244,63,94,0.25)]'
                  : 'border-amber-500/60 bg-gradient-to-b from-amber-950/80 to-slate-950 shadow-[0_0_50px_rgba(217,119,6,0.25)]'
            }`}
          >
            <span className="text-4xl">
              {isVictory ? '🏆' : isDefeat ? '💀' : '⚖️'}
            </span>
            <h2 className="mt-2 text-3xl font-black tracking-wider md:text-5xl font-mono">
              {isVictory && <span className="text-emerald-400">VICTOIRE</span>}
              {isDefeat && <span className="text-rose-400">DÉFAITE</span>}
              {isDraw && <span className="text-amber-400">ÉGALITÉ PARFAITE</span>}
            </h2>
            <p className="mt-2 text-sm font-mono text-slate-300">
              {isVictory && 'Superbe performance ! Vous dominez le combat algorithmique.'}
              {isDefeat && 'Votre adversaire a pris l\'avantage de vélocité ou de précision.'}
              {isDraw && 'Scores identiques à l\'issue des 10 rounds intenses.'}
            </p>
          </div>

          {/* Cartes comparatives côte à côte */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Carte Joueur */}
            <div
              className={`flex flex-col rounded-xl border p-5 bg-slate-900/60 ${
                isVictory ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-white/10'
              }`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/20 text-xs font-mono font-bold text-emerald-400">
                    P1
                  </span>
                  <span className="font-mono text-base font-bold text-slate-100">
                    {playerStats.name}
                  </span>
                </div>
                {isVictory && (
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-mono font-bold text-emerald-300">
                    VAINQUEUR
                  </span>
                )}
              </div>

              <div className="my-4 flex flex-col items-center justify-center rounded-lg bg-slate-950/60 p-4">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Score Final
                </span>
                <span className="mt-1 font-mono text-4xl font-black text-emerald-400">
                  {playerStats.totalScore.toLocaleString()}
                </span>
              </div>

              <div className="space-y-3 text-sm font-mono">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Précision :</span>
                  <span className="font-bold text-emerald-400">
                    {playerStats.correctAnswers}/{totalQuestions} ({playerAccuracy}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Temps moyen de réponse :</span>
                  <span className="font-bold text-slate-100">{playerAvgResponseTime}s</span>
                </div>
              </div>
            </div>

            {/* Carte Adversaire */}
            <div
              className={`flex flex-col rounded-xl border p-5 bg-slate-900/60 ${
                isDefeat ? 'border-rose-500/50 ring-1 ring-rose-500/30' : 'border-white/10'
              }`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-rose-500/20 text-xs font-mono font-bold text-rose-400">
                    {driver === 'websocket' ? 'RIVAL' : 'BOT'}
                  </span>
                  <span className="font-mono text-base font-bold text-slate-100">
                    {opponentStats.name}
                  </span>
                </div>
                {isDefeat && (
                  <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs font-mono font-bold text-rose-300">
                    VAINQUEUR
                  </span>
                )}
              </div>

              <div className="my-4 flex flex-col items-center justify-center rounded-lg bg-slate-950/60 p-4">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Score Final
                </span>
                <span className="mt-1 font-mono text-4xl font-black text-rose-400">
                  {opponentStats.totalScore.toLocaleString()}
                </span>
              </div>

              <div className="space-y-3 text-sm font-mono">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Précision :</span>
                  <span className="font-bold text-rose-400">
                    {opponentStats.correctAnswers}/{totalQuestions} ({opponentAccuracy}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Temps moyen de réponse :</span>
                  <span className="font-bold text-slate-100">{opponentAvgResponseTime}s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chronologie / Visualisation des 10 rounds */}
          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/50 p-5">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
              Historique Round par Round (10 manches)
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 md:grid-cols-10">
              {Array.from({ length: totalQuestions }).map((_, idx) => {
                const historyItem = roundHistory[idx];
                const playerWonRound =
                  historyItem?.playerResult.isCorrect ?? (playerStats.roundScores[idx] ?? 0) > 0;
                const oppWonRound =
                  historyItem?.opponentResult.isCorrect ?? (opponentStats.roundScores[idx] ?? 0) > 0;

                return (
                  <div
                    key={`round-summary-${idx + 1}`}
                    className="flex flex-col items-center justify-center rounded-lg border border-white/5 bg-slate-950/70 p-2.5 font-mono text-xs"
                  >
                    <span className="text-[11px] text-slate-400">R{idx + 1}</span>
                    <div className="my-1.5 flex items-center gap-1.5">
                      <span
                        title={`Joueur: ${playerWonRound ? 'Correct' : 'Erreur'}`}
                        className={`h-3 w-3 rounded-full ${
                          playerWonRound ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                      />
                      <span className="text-[9px] text-slate-600">vs</span>
                      <span
                        title={`Adversaire: ${oppWonRound ? 'Correct' : 'Erreur'}`}
                        className={`h-3 w-3 rounded-full ${
                          oppWonRound ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {playerStats.roundScores[idx] ?? 0} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Boutons d'action Post-Mortem */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 font-mono">
            <button
              type="button"
              onClick={handleSwitchToMatchmaking}
              className="flex items-center gap-2 rounded-xl border border-emerald-500 bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-[0_0_25px_rgba(34,197,94,0.35)] transition-all hover:bg-emerald-400 hover:shadow-[0_0_35px_rgba(34,197,94,0.5)] active:scale-[0.98]"
            >
              <span>⚡</span>
              <span>REJOUER UN MATCH EN LIGNE (1v1)</span>
            </button>

            <button
              type="button"
              onClick={handleSwitchToBot}
              className="flex items-center gap-2 rounded-xl border border-purple-500/50 bg-purple-950/60 px-6 py-3.5 text-sm font-bold text-purple-300 transition-all hover:bg-purple-900/60 active:scale-[0.98]"
            >
              <span>🤖</span>
              <span>S&apos;ENTRAÎNER VS DEVBOT</span>
            </button>

            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-6 py-3.5 text-sm font-bold text-slate-300 transition-all hover:bg-slate-800 hover:text-white active:scale-[0.98]"
            >
              <span>←</span>
              <span>QUITTER L&apos;ARÈNE</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default DuelArena;
