'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Question, PlayerStats, PlayerRoundResult, DuelDriverType } from '@/types/duel';
import { useQuizDuel, ROUND_TIME_MS } from '@/hooks/useQuizDuel';
import { useDuelAntiCheat } from '@/hooks/useDuelAntiCheat';
import { DEFAULT_DUEL_QUESTIONS } from '@/lib/duelMockQuestions';
import { playMatchFound, playVictory, playDefeat } from '@/lib/sounds';

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
  const searchParams = useSearchParams();
  const modeParam = searchParams.get('mode');
  const effectiveInitialDriver: DuelDriverType =
    modeParam === 'offline'
      ? 'local_bot'
      : modeParam === 'online'
        ? 'websocket'
        : initialDriver;

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
    forfeitDuel,
    forfeitOutcome,
    driver,
    setDriver,
    isSearchingMatch,
    searchDurationSeconds,
    queuePosition,
    errorMessage,
    cancelSearch,
    startMatchmaking,
    isOnline,

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
    driver: effectiveInitialDriver,
    onRoundComplete: handleRoundComplete,
    onFinish,
  });

  // Détection des rounds de combat actif pour armer l'anti-triche
  const isCombatActive =
    (duelState === 'READING' || duelState === 'RESOLUTION') &&
    !isSearchingMatch &&
    !isMatchProposed;

  const handleAntiCheatForfeit = useCallback(() => {
    forfeitDuel('ANTI_CHEAT_FORFEIT');
  }, [forfeitDuel]);

  const {
    tabSwitchCount,
    showWarningModal,
    dismissWarning,
    resetAntiCheat,
    queueCooldownRemaining,
    isBannedFromQueue,
  } = useDuelAntiCheat({
    isActive: isCombatActive,
    onForfeit: handleAntiCheatForfeit,
  });

  // Détermination du résultat final : Le forfait / disqualification prévaut STRICTEMENT sur le score
  const isVictory =
    forfeitOutcome === 'opponent'
      ? true
      : forfeitOutcome === 'self'
        ? false
        : playerStats.totalScore > opponentStats.totalScore;

  const isDefeat =
    forfeitOutcome === 'self'
      ? true
      : forfeitOutcome === 'opponent'
        ? false
        : playerStats.totalScore < opponentStats.totalScore;

  const isDraw =
    forfeitOutcome !== null
      ? false
      : playerStats.totalScore === opponentStats.totalScore;

  // Références de garde pour déclencher chaque effet sonore une seule fois
  const hasPlayedMatchFoundRef = useRef(false);
  const hasPlayedEndSoundRef = useRef(false);

  // 1. Déclenchement automatique du son Match Found lors de l'entrée en Ready Check
  useEffect(() => {
    if (isMatchProposed) {
      if (!hasPlayedMatchFoundRef.current) {
        hasPlayedMatchFoundRef.current = true;
        playMatchFound();
      }
    } else {
      hasPlayedMatchFoundRef.current = false;
    }
  }, [isMatchProposed]);

  // 2. Déclenchement automatique des sons Victoire / Défaite à la fin du duel (Post-Mortem)
  useEffect(() => {
    if (duelState === 'FINISHED') {
      if (!hasPlayedEndSoundRef.current) {
        hasPlayedEndSoundRef.current = true;
        if (isVictory) {
          playVictory();
        } else if (isDefeat) {
          playDefeat();
        }
      }
    } else {
      hasPlayedEndSoundRef.current = false;
    }
  }, [duelState, isVictory, isDefeat]);

  const handleRestart = useCallback(() => {
    hasPlayedMatchFoundRef.current = false;
    hasPlayedEndSoundRef.current = false;
    resetAntiCheat();
    setRoundHistory([]);
    restartDuel();
  }, [restartDuel, resetAntiCheat]);

  const handleSwitchToBot = useCallback(() => {
    hasPlayedMatchFoundRef.current = false;
    hasPlayedEndSoundRef.current = false;
    resetAntiCheat();
    setRoundHistory([]);
    cancelSearch();
    setDriver('local_bot');
    restartDuel('local_bot');
  }, [cancelSearch, setDriver, restartDuel, resetAntiCheat]);

  const handleSwitchToMatchmaking = useCallback(() => {
    if (isBannedFromQueue) {
      return;
    }
    hasPlayedMatchFoundRef.current = false;
    hasPlayedEndSoundRef.current = false;
    resetAntiCheat();
    setRoundHistory([]);
    startMatchmaking();
  }, [isBannedFromQueue, startMatchmaking, resetAntiCheat]);

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
      className={`mx-auto flex w-full max-w-4xl flex-col rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/80 p-3.5 sm:p-6 md:p-8 font-sans text-slate-100 shadow-2xl backdrop-blur-md duel-no-copy select-none ${className}`}
    >
      {/* ======================================================== */}
      {/* 1. HEADER DU TERMINAL & SÉLECTEUR DE MODE               */}
      {/* ======================================================== */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4 border-b border-white/10 pb-4 sm:pb-5">
        {/* Bandeau d'état réseau Cyberpunk Hors-ligne */}
        {!isOnline && (
          <div className="relative overflow-hidden rounded-xl border border-amber-500/60 bg-gradient-to-r from-amber-950/90 via-rose-950/80 to-amber-950/90 p-3 sm:p-4 font-mono shadow-[0_0_25px_rgba(245,158,11,0.25)] backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
                </span>
                <span className="font-black tracking-wider text-amber-200 text-xs sm:text-sm">
                  ⚠️ MODE HORS-LIGNE DÉTECTÉ
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                <span className="rounded border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  DÉCONNECTÉ
                </span>
                {driver !== 'local_bot' && (
                  <button
                    type="button"
                    onClick={handleSwitchToBot}
                    className="rounded bg-amber-400 px-3 py-1.5 text-xs font-black text-slate-950 shadow-md transition-all hover:bg-amber-300 active:scale-95 cursor-pointer"
                  >
                    Passer sur DevBot
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Barre style terminal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="ml-1 font-semibold tracking-wider text-slate-300 text-[11px] sm:text-xs">
              DEVARENA :: 1V1 PROTOCOL
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isOnline ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-950/60 px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-semibold text-rose-300">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                HORS-LIGNE
              </span>
            ) : driver === 'websocket' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 animate-ping rounded-full bg-emerald-400" />
                ARBITRAGE SERVEUR
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-950/60 px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-semibold text-purple-300">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                DEVBOT SOLO
              </span>
            )}

            <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] sm:text-xs text-slate-300">
              {isSearchingMatch && 'MATCHMAKING'}
              {!isSearchingMatch && duelState === 'READING' && 'LIVE COMBAT'}
              {!isSearchingMatch && duelState === 'RESOLUTION' && 'RÉSULTAT'}
              {!isSearchingMatch && duelState === 'FINISHED' && 'TERMINÉ'}
            </span>

            {/* Badge de statut Anti-Triche pendant le combat */}
            {isCombatActive && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 sm:px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-semibold ${
                  tabSwitchCount === 0
                    ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300'
                    : 'border-rose-500/60 bg-rose-950/80 text-rose-300 animate-pulse ring-1 ring-rose-500'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    tabSwitchCount === 0 ? 'bg-emerald-400' : 'bg-rose-400 animate-ping'
                  }`}
                />
                <span>ANTI-TRICHE ACTIF</span>
                {tabSwitchCount > 0 && (
                  <span className="rounded bg-rose-500/20 px-1 text-[9px] font-black text-rose-200">
                    AVERTISSEMENT 1/2
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Bannière d'alerte de bannissement temporaire de file (Anti-triche) */}
        {isBannedFromQueue && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-500/60 bg-gradient-to-r from-rose-950/90 via-slate-950 to-rose-950/90 p-3.5 sm:p-4 text-xs font-mono text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse">
            <div className="flex items-center gap-2.5">
              <span className="text-xl shrink-0">🚫</span>
              <div>
                <p className="font-bold text-rose-300">
                  BANNISSEMENT TEMPORAIRE ACTIF : {queueCooldownRemaining}s restant(s)
                </p>
                <p className="text-[11px] text-slate-300">
                  La file multijoueur est suspendue suite à une perte de focus répétée.
                </p>
              </div>
            </div>
            {driver !== 'local_bot' && (
              <button
                type="button"
                onClick={handleSwitchToBot}
                className="w-full sm:w-auto rounded-lg border border-purple-400/60 bg-purple-950/80 px-3.5 py-2 text-xs font-black text-purple-200 hover:bg-purple-900/60 transition-all cursor-pointer shadow-md"
              >
                Jouer contre le DevBot
              </button>
            )}
          </div>
        )}

        {/* Bannière de message d'erreur ou d'alerte */}
        {errorMessage && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-950/50 p-3 text-xs font-mono text-amber-200 shadow-lg">
            <div className="flex items-start sm:items-center gap-2">
              <span className="text-base leading-none shrink-0">⚠️</span>
              <span className="leading-snug">{errorMessage}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSwitchToBot}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/60 bg-cyan-950/70 px-3 py-2 sm:py-1 font-bold text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.25)] hover:bg-cyan-900/60 transition-all active:scale-95 text-xs w-full sm:w-auto cursor-pointer"
              >
                <span>🤖 Basculer vers le DevBot</span>
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="rounded bg-amber-500/20 px-3 py-2 sm:py-1 text-center text-amber-300 hover:bg-amber-500/30 transition-all active:scale-95 w-full sm:w-auto cursor-pointer"
              >
                Recommencer
              </button>
            </div>
          </div>
        )}

        {/* Sélecteur de mode en haut d'arène */}
        {!isSearchingMatch && duelState !== 'FINISHED' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 rounded-lg border border-white/5 bg-slate-900/40 p-2.5 sm:px-3 sm:py-2 text-xs font-mono">
            <span className="text-slate-400 text-[11px] sm:text-xs">Mode de jeu sélectionné :</span>
            <div className="grid grid-cols-1 sm:flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={!isOnline || isBannedFromQueue}
                onClick={handleSwitchToMatchmaking}
                className={`w-full sm:w-auto flex items-center justify-center rounded-md px-3 py-2 sm:py-1.5 font-semibold text-xs transition-all ${
                  isBannedFromQueue
                    ? 'opacity-60 cursor-not-allowed border border-rose-500/50 bg-rose-950/40 text-rose-300'
                    : !isOnline
                      ? 'opacity-50 cursor-not-allowed border border-white/5 bg-slate-900/40 text-slate-500'
                      : driver === 'websocket'
                        ? 'border border-emerald-500/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                        : 'border border-white/10 bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                <span>🌐 Multijoueur en Ligne (1v1)</span>
                {isBannedFromQueue ? (
                  <span className="ml-1 text-[10px] font-bold text-rose-400">
                    (Banni {queueCooldownRemaining}s)
                  </span>
                ) : !isOnline ? (
                  <span className="ml-1 text-[10px] font-normal text-amber-400/90">
                    (Hors-ligne)
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={handleSwitchToBot}
                className={`w-full sm:w-auto relative rounded-md px-3 py-2 sm:py-1.5 font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                  !isOnline
                    ? 'border-2 border-amber-400 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-amber-950/60 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.5)] animate-pulse'
                    : driver === 'local_bot'
                      ? 'border border-purple-500/60 bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                      : 'border border-white/10 bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                <span>🤖 DevBot Solo</span>
                {!isOnline && (
                  <span className="rounded border border-amber-400/60 bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-amber-300 shadow-sm">
                    RECOMMANDÉ
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* READY CHECK : CONFIRMATION MUTUELLE AVANT LE DUEL        */}
        {/* ======================================================== */}
        {isMatchProposed ? (
          <div className="my-4 sm:my-6 relative overflow-hidden rounded-2xl border border-emerald-500/50 bg-gradient-to-b from-slate-900 via-slate-950 to-zinc-950 p-4 sm:p-6 md:p-8 font-mono shadow-[0_0_50px_rgba(16,185,129,0.15)] backdrop-blur-xl">
            {/* Lueurs d'arrière-plan */}
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

            {/* En-tête Ready Check */}
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-3 py-1 sm:px-4 sm:py-1.5 text-[11px] sm:text-xs font-bold text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>MATCH TROUVÉ ! CONFIRMATION REQUISE</span>
              </div>
              <h3 className="mt-2 sm:mt-3 text-lg font-black tracking-wider text-slate-100 sm:text-2xl">
                ACCEPTEZ-VOUS CE DUEL ?
              </h3>
              <p className="mt-1 text-[11px] sm:text-xs text-slate-400 max-w-md mx-auto">
                Les deux joueurs doivent confirmer dans le délai imparti pour lancer la manche 1.
              </p>
            </div>

            {/* Compteur 10s et barre de progression */}
            <div className="my-4 sm:my-6 text-center relative z-10">
              <div className="inline-block rounded-xl sm:rounded-2xl border border-zinc-700 bg-zinc-900/90 px-4 py-2 sm:px-6 sm:py-3 shadow-inner">
                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Temps restant pour confirmer
                </div>
                <div
                  className={`text-2xl sm:text-3xl font-black tracking-widest transition-colors ${
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
              <div className="mx-auto mt-2 sm:mt-3 h-2 max-w-md overflow-hidden rounded-full bg-zinc-800 border border-zinc-700">
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

            {/* Confrontation Face-à-Face responsive */}
            <div className="relative z-10 flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-4 items-center rounded-xl border border-white/10 bg-slate-900/80 p-3.5 sm:p-5 shadow-lg">
              {/* Joueur (Vous) */}
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left w-full">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Votre profil
                </span>
                <span className="mt-0.5 text-sm sm:text-base font-bold text-slate-100 break-all">{playerName}</span>
                <div className="mt-1.5">
                  {hasAcceptedMatch ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-950/70 px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      VOUS ÊTES PRÊT !
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/50 px-2.5 py-0.5 text-[11px] sm:text-xs font-medium text-amber-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                      En attente de votre clic
                    </span>
                  )}
                </div>
              </div>

              {/* VS Emblem */}
              <div className="flex items-center justify-center my-1 sm:my-0">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 border-emerald-500/60 bg-emerald-950/80 font-black text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-xs sm:text-sm">
                  VS
                </div>
              </div>

              {/* Adversaire */}
              <div className="flex flex-col items-center sm:items-end text-center sm:text-right w-full">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Adversaire trouvé
                </span>
                <span className="mt-0.5 text-sm sm:text-base font-bold text-slate-100 break-all">
                  {proposedOpponent?.name || opponentStats.name}
                </span>
                <div className="mt-1.5">
                  {hasOpponentAccepted ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-950/70 px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      L&apos;ADVERSAIRE EST PRÊT !
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-[11px] sm:text-xs font-medium text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-ping shrink-0" />
                      En attente de confirmation...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Boutons d'Action (h-12 minimum, w-full on mobile) */}
            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10 w-full">
              <button
                type="button"
                onClick={acceptMatch}
                disabled={hasAcceptedMatch}
                className={`w-full sm:w-auto min-h-[48px] h-12 inline-flex items-center justify-center gap-2 rounded-xl px-8 text-sm font-black tracking-wider transition-all shadow-xl active:scale-95 cursor-pointer ${
                  hasAcceptedMatch
                    ? 'border border-emerald-500/60 bg-emerald-950/80 text-emerald-200 cursor-default shadow-[0_0_25px_rgba(16,185,129,0.2)]'
                    : 'border border-emerald-400 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                }`}
              >
                {hasAcceptedMatch ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    <span>PRÊT - EN ATTENTE...</span>
                  </>
                ) : (
                  <span>⚡ ACCEPTER LE MATCH</span>
                )}
              </button>

              <button
                type="button"
                onClick={declineMatch}
                className="w-full sm:w-auto min-h-[48px] h-12 inline-flex items-center justify-center rounded-xl border border-rose-500/40 bg-rose-950/40 px-6 text-xs font-bold text-rose-300 transition-all hover:border-rose-500 hover:bg-rose-900/60 active:scale-95 cursor-pointer"
              >
                ✕ REFUSER
              </button>
            </div>
          </div>
        ) : isSearchingMatch ? (
          <div className="my-4 sm:my-6 flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950 p-4 sm:p-8 text-center font-mono shadow-2xl">
            {/* Animation Radar Adaptative */}
            <div className="relative mb-4 sm:mb-6 flex h-36 w-36 sm:h-48 sm:w-48 md:h-56 md:w-56 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full border border-emerald-500/20" />
              <div className="absolute inset-3 sm:inset-4 rounded-full border border-emerald-500/30 bg-emerald-950/20" />
              <div className="absolute inset-7 sm:inset-10 rounded-full border border-emerald-500/40" />
              <div className="absolute inset-11 sm:inset-16 rounded-full border border-emerald-500/60" />
              <div className="absolute h-0.5 sm:h-1 w-full bg-emerald-500/10" />
              <div className="absolute h-full w-0.5 sm:w-1 bg-emerald-500/10" />
              <div className="absolute inset-0 animate-spin rounded-full border-t-2 border-emerald-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]" />
              <span className="relative z-10 text-xl sm:text-2xl font-black text-emerald-400 animate-pulse">
                ⚡
              </span>
            </div>

            <h3 className="text-base sm:text-lg md:text-xl font-black tracking-wider text-emerald-400">
              RECHERCHE D&apos;UN ADVERSAIRE EN LIGNE...
            </h3>
            <p className="mt-1 text-[11px] sm:text-xs text-slate-400 max-w-sm">
              Connexion établie à la passerelle WebSocket (Port 3000)
            </p>

            {/* Métriques de file empilées sur mobile */}
            <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs w-full sm:w-auto">
              <div className="w-full sm:w-auto rounded-lg border border-white/10 bg-slate-900/80 px-4 py-2">
                <span className="text-slate-400">TEMPS ÉCOULÉ : </span>
                <span className="font-bold text-emerald-300">
                  {searchMin}:{searchSec}
                </span>
              </div>
              <div className="w-full sm:w-auto rounded-lg border border-white/10 bg-slate-900/80 px-4 py-2">
                <span className="text-slate-400">POSITION FILE : </span>
                <span className="font-bold text-emerald-300">
                  #{queuePosition ?? 1}
                </span>
              </div>
            </div>

            {/* Boutons d'action radar pleine largeur sur mobile */}
            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              {(!isOnline || errorMessage) && (
                <button
                  type="button"
                  onClick={handleSwitchToBot}
                  className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border-2 border-cyan-400 bg-cyan-950/80 px-5 py-2.5 text-xs font-black text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-900/80 active:scale-95 animate-pulse cursor-pointer"
                >
                  <span>🤖 Basculer vers l&apos;entraînement DevBot</span>
                </button>
              )}
              <button
                type="button"
                onClick={cancelSearch}
                className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center rounded-xl border border-rose-500/40 bg-rose-950/40 px-5 py-2.5 text-xs font-bold text-rose-300 transition-all hover:bg-rose-900/50 hover:border-rose-500 active:scale-95 cursor-pointer"
              >
                ✕ Annuler la recherche
              </button>
              {isOnline && !errorMessage && (
                <button
                  type="button"
                  onClick={handleSwitchToBot}
                  className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center rounded-xl border border-purple-500/40 bg-purple-950/40 px-5 py-2.5 text-xs font-bold text-purple-300 transition-all hover:bg-purple-900/50 hover:border-purple-500 active:scale-95 cursor-pointer"
                >
                  🤖 Jouer immédiatement contre le DevBot
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Header de confrontation 3 colonnes pendant le match - optimisé ultra-compact mobile */
          <div className="grid grid-cols-3 items-center gap-1.5 sm:gap-4 rounded-xl border border-white/5 bg-slate-900/60 p-2.5 sm:p-4">
            {/* Côté gauche : Joueur */}
            <div className="flex flex-col items-start gap-0.5 sm:gap-1 overflow-hidden">
              <div className="flex items-center gap-1.5 sm:gap-2 max-w-full">
                <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-950/50 text-[10px] sm:text-xs font-mono font-bold text-emerald-300 shrink-0">
                  P1
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[70px] sm:max-w-none">
                  {playerStats.name}
                </span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-lg sm:text-2xl font-black text-emerald-400">
                  {playerStats.totalScore.toLocaleString()}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400">PTS</span>
              </div>
              <div className="mt-0.5">
                {isPlayerAnswered ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-xs font-mono font-medium text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="hidden sm:inline">RÉPONSE VALIDÉE</span>
                    <span className="inline sm:hidden">VALIDÉ</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-950/30 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-xs font-mono font-medium text-amber-300">
                    <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-400 shrink-0" />
                    <span className="hidden sm:inline">EN RÉFLEXION...</span>
                    <span className="inline sm:hidden">ACTIF...</span>
                  </span>
                )}
              </div>
            </div>

            {/* Centre : Round et Chrono */}
            <div className="flex flex-col items-center justify-center text-center px-1">
              <span className="rounded-full border border-white/10 bg-slate-800/80 px-2 sm:px-3 py-0.5 sm:py-1 font-mono text-[9px] sm:text-xs font-semibold tracking-wider text-slate-300 whitespace-nowrap">
                Q {roundNum}/{totalNum}
              </span>
              <span className={`my-0.5 sm:my-1 font-mono text-xl sm:text-3xl md:text-4xl font-black tracking-tight ${chronoColorClass}`}>
                {formattedTime}
              </span>
              <span className="text-[9px] sm:text-[11px] font-mono tracking-wide text-slate-400 hidden xs:block">
                {duelState === 'RESOLUTION' ? 'GEL DU SCORE' : 'TEMPS RESTANT'}
              </span>
            </div>

            {/* Côté droit : Adversaire (Humain ou DevBot) */}
            <div className="flex flex-col items-end gap-0.5 sm:gap-1 overflow-hidden">
              <div className="flex items-center justify-end gap-1.5 sm:gap-2 max-w-full">
                <span className="font-mono text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[70px] sm:max-w-none text-right">
                  {opponentStats.name}
                </span>
                {driver === 'websocket' ? (
                  <span className="flex h-6 px-1.5 sm:h-7 sm:px-2 items-center justify-center rounded-md border border-cyan-500/40 bg-cyan-950/50 text-[10px] sm:text-xs font-mono font-bold text-cyan-300 shrink-0">
                    1V1
                  </span>
                ) : (
                  <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md border border-rose-500/40 bg-rose-950/50 text-[10px] sm:text-xs font-mono font-bold text-rose-300 shrink-0">
                    BOT
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-lg sm:text-2xl font-black text-rose-400">
                  {opponentStats.totalScore.toLocaleString()}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400">PTS</span>
              </div>
              <div className="mt-0.5">
                {isOpponentAnswered ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-xs font-mono font-medium text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="hidden sm:inline">RÉPONSE VALIDÉE</span>
                    <span className="inline sm:hidden">VALIDÉ</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-950/30 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-xs font-mono font-medium text-amber-300">
                    <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-400 shrink-0" />
                    <span className="hidden sm:inline">EN RÉFLEXION...</span>
                    <span className="inline sm:hidden">ACTIF...</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Jauge de temps horizontale */}
        {!isSearchingMatch && (
          <div className="relative h-2 sm:h-2.5 w-full overflow-hidden rounded-full border border-white/10 bg-slate-900/90 shadow-inner">
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
        <div className="flex flex-col gap-4 sm:gap-6 duel-no-copy select-none">
          {/* Bloc Question */}
          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3.5 sm:p-5 shadow-lg duel-no-copy select-none">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold leading-relaxed text-slate-100 duel-no-copy select-none">
              {currentQuestion.prompt}
            </h2>

            {/* Snippet de code optionnel avec scroll horizontal fluide et protection anti-sélection */}
            {currentQuestion.snippet && (
              <pre className="mt-3 sm:mt-4 max-w-full overflow-x-auto whitespace-pre rounded-lg border border-slate-700/60 bg-slate-950 p-3 sm:p-4 font-mono text-xs sm:text-sm text-emerald-300 leading-relaxed shadow-inner duel-no-copy select-none">
                <code className="duel-no-copy select-none">{currentQuestion.snippet}</code>
              </pre>
            )}
          </div>

          {/* Grille des 4 options de réponse (1 col mobile, 2 col tablet+) */}
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2 duel-no-copy select-none">
            {currentQuestion.options.map((optionText, index) => {
              const isSelectedByPlayer = playerRoundResult?.selectedIndex === index;
              const isCorrectAnswer = currentQuestion.correctIndex === index;
              const isResolutionPhase = duelState === 'RESOLUTION';

              let buttonStyles =
                'border-white/10 bg-slate-900/60 text-slate-200 hover:border-emerald-500/50 hover:bg-slate-800/80 hover:text-white';
              let badgeStyles = 'border-white/20 bg-slate-800 text-slate-300';

              if (isResolutionPhase) {
                if (isCorrectAnswer) {
                  buttonStyles =
                    'border-emerald-500 bg-emerald-950/60 text-emerald-200 shadow-[0_0_20px_rgba(34,197,94,0.35)] ring-1 ring-emerald-400';
                  badgeStyles = 'border-emerald-400 bg-emerald-500 text-slate-950 font-black';
                } else if (isSelectedByPlayer && !playerRoundResult?.isCorrect) {
                  buttonStyles =
                    'border-rose-500 bg-rose-950/60 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.35)] ring-1 ring-rose-400';
                  badgeStyles = 'border-rose-400 bg-rose-500 text-white font-black';
                } else {
                  buttonStyles = 'border-white/5 bg-slate-950/40 text-slate-500 opacity-60';
                  badgeStyles = 'border-white/10 bg-slate-900 text-slate-600';
                }
              } else if (isSelectedByPlayer) {
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
                  className={`group relative flex items-start gap-2.5 sm:gap-3 rounded-xl border p-3.5 sm:p-4 text-left min-h-[52px] sm:min-h-[58px] duel-no-copy select-none transition-all duration-150 ${buttonStyles} ${
                    isPlayerAnswered || isResolutionPhase ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md border font-mono text-xs sm:text-sm font-bold transition-colors ${badgeStyles}`}
                  >
                    {OPTION_LETTERS[index]}
                  </span>
                  <span className="text-xs sm:text-sm font-medium leading-relaxed pr-6 sm:pr-8 duel-no-copy select-none">{optionText}</span>

                  {/* Badge discret de sélection en phase de lecture */}
                  {isSelectedByPlayer && !isResolutionPhase && (
                    <span className="absolute right-2 sm:right-3 top-2 sm:top-3 rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px] font-semibold text-emerald-300">
                      CHOISI
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Résumé intermédiaire du round pendant le gel de 2s */}
          {duelState === 'RESOLUTION' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 rounded-xl border border-white/10 bg-slate-900/90 p-3 sm:p-4 font-mono text-xs shadow-lg animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">RÉSULTAT :</span>
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
                <div className="flex items-center gap-2 text-slate-400 text-[11px] sm:text-xs">
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
        <div className="flex flex-col gap-6 sm:gap-8 py-2">
          {/* Bannière de résultat percutante */}
          <div
            className={`flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border p-4 sm:p-6 text-center shadow-2xl ${
              isVictory
                ? 'border-emerald-500/60 bg-gradient-to-b from-emerald-950/80 to-slate-950 shadow-[0_0_50px_rgba(34,197,94,0.25)]'
                : isDefeat
                  ? 'border-rose-500/60 bg-gradient-to-b from-rose-950/80 to-slate-950 shadow-[0_0_50px_rgba(244,63,94,0.25)]'
                  : 'border-amber-500/60 bg-gradient-to-b from-amber-950/80 to-slate-950 shadow-[0_0_50px_rgba(217,119,6,0.25)]'
            }`}
          >
            <span className="text-3xl sm:text-4xl">
              {forfeitOutcome === 'self'
                ? '🚫'
                : forfeitOutcome === 'opponent'
                  ? '🏆'
                  : isVictory
                    ? '🏆'
                    : isDefeat
                      ? '💀'
                      : '⚖️'}
            </span>
            <h2 className="mt-2 text-2xl sm:text-4xl md:text-5xl font-black tracking-wider font-mono">
              {forfeitOutcome === 'self' && (
                <span className="text-rose-500 animate-pulse">DISQUALIFIÉ - TRICHE DÉTECTÉE</span>
              )}
              {forfeitOutcome === 'opponent' && (
                <span className="text-emerald-400">VICTOIRE PAR DISQUALIFICATION ADVERSE</span>
              )}
              {!forfeitOutcome && isVictory && <span className="text-emerald-400">VICTOIRE</span>}
              {!forfeitOutcome && isDefeat && <span className="text-rose-400">DÉFAITE</span>}
              {!forfeitOutcome && isDraw && <span className="text-amber-400">ÉGALITÉ PARFAITE</span>}
            </h2>
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-mono text-slate-300 max-w-lg mx-auto">
              {forfeitOutcome === 'self' &&
                'Vous avez été disqualifié pour perte de focus répétée pendant le combat compétitif. Un bannissement temporaire d\'une minute est actif.'}
              {forfeitOutcome === 'opponent' &&
                'Votre adversaire a été disqualifié pour violation des règles de sécurité anti-triche. La victoire vous est accordée d\'office.'}
              {!forfeitOutcome && isVictory &&
                'Superbe performance ! Vous dominez le combat algorithmique.'}
              {!forfeitOutcome && isDefeat &&
                'Votre adversaire a pris l\'avantage de vélocité ou de précision.'}
              {!forfeitOutcome && isDraw &&
                'Scores identiques à l\'issue des 10 rounds intenses.'}
            </p>
          </div>

          {/* Cartes comparatives côte à côte ou empilées sur mobile */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            {/* Carte Joueur */}
            <div
              className={`flex flex-col rounded-xl border p-4 sm:p-5 bg-slate-900/60 ${
                isVictory ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-white/10'
              }`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/20 text-xs font-mono font-bold text-emerald-400">
                    P1
                  </span>
                  <span className="font-mono text-sm sm:text-base font-bold text-slate-100 break-all">
                    {playerStats.name}
                  </span>
                </div>
                {isVictory && (
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-mono font-bold text-emerald-300">
                    {forfeitOutcome === 'opponent' ? 'VAINQUEUR (DISQUALIF. ADVERSE)' : 'VAINQUEUR'}
                  </span>
                )}
                {forfeitOutcome === 'self' && (
                  <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs font-mono font-bold text-rose-400 animate-pulse">
                    DISQUALIFIÉ
                  </span>
                )}
              </div>

              <div className="my-3 sm:my-4 flex flex-col items-center justify-center rounded-lg bg-slate-950/60 p-3 sm:p-4">
                <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-slate-400">
                  Score Final
                </span>
                <span className="mt-1 font-mono text-3xl sm:text-4xl font-black text-emerald-400">
                  {playerStats.totalScore.toLocaleString()}
                </span>
              </div>

              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm font-mono">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Précision :</span>
                  <span className="font-bold text-emerald-400">
                    {playerStats.correctAnswers}/{totalQuestions} ({playerAccuracy}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Temps moyen :</span>
                  <span className="font-bold text-slate-100">{playerAvgResponseTime}s</span>
                </div>
              </div>
            </div>

            {/* Carte Adversaire */}
            <div
              className={`flex flex-col rounded-xl border p-4 sm:p-5 bg-slate-900/60 ${
                isDefeat ? 'border-rose-500/50 ring-1 ring-rose-500/30' : 'border-white/10'
              }`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-rose-500/20 text-xs font-mono font-bold text-rose-400">
                    {driver === 'websocket' ? 'RIVAL' : 'BOT'}
                  </span>
                  <span className="font-mono text-sm sm:text-base font-bold text-slate-100 break-all">
                    {opponentStats.name}
                  </span>
                </div>
                {isDefeat && (
                  <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs font-mono font-bold text-rose-300">
                    {forfeitOutcome === 'self' ? 'VAINQUEUR PAR FORFAIT' : 'VAINQUEUR'}
                  </span>
                )}
                {forfeitOutcome === 'opponent' && (
                  <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs font-mono font-bold text-rose-400">
                    DISQUALIFIÉ
                  </span>
                )}
              </div>

              <div className="my-3 sm:my-4 flex flex-col items-center justify-center rounded-lg bg-slate-950/60 p-3 sm:p-4">
                <span className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-slate-400">
                  Score Final
                </span>
                <span className="mt-1 font-mono text-3xl sm:text-4xl font-black text-rose-400">
                  {opponentStats.totalScore.toLocaleString()}
                </span>
              </div>

              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm font-mono">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Précision :</span>
                  <span className="font-bold text-rose-400">
                    {opponentStats.correctAnswers}/{totalQuestions} ({opponentAccuracy}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Temps moyen :</span>
                  <span className="font-bold text-slate-100">{opponentAvgResponseTime}s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chronologie / Visualisation des 10 rounds (5 col mobile, 10 col tablet+) */}
          <div className="flex flex-col gap-2.5 sm:gap-3 rounded-xl border border-white/10 bg-slate-900/50 p-3.5 sm:p-5">
            <h3 className="font-mono text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
              Historique Round par Round (10 manches)
            </h3>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
              {Array.from({ length: totalQuestions }).map((_, idx) => {
                const historyItem = roundHistory[idx];
                const playerWonRound =
                  historyItem?.playerResult.isCorrect ?? (playerStats.roundScores[idx] ?? 0) > 0;
                const oppWonRound =
                  historyItem?.opponentResult.isCorrect ?? (opponentStats.roundScores[idx] ?? 0) > 0;

                return (
                  <div
                    key={`round-summary-${idx + 1}`}
                    className="flex flex-col items-center justify-center rounded-lg border border-white/5 bg-slate-950/70 p-1.5 sm:p-2.5 font-mono text-[10px] sm:text-xs"
                  >
                    <span className="text-[10px] text-slate-400 font-bold">R{idx + 1}</span>
                    <div className="my-1 flex items-center gap-1 sm:gap-1.5">
                      <span
                        title={`Joueur: ${playerWonRound ? 'Correct' : 'Erreur'}`}
                        className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${
                          playerWonRound ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                      />
                      <span className="text-[8px] sm:text-[9px] text-slate-600">:</span>
                      <span
                        title={`Adversaire: ${oppWonRound ? 'Correct' : 'Erreur'}`}
                        className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${
                          oppWonRound ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                      />
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-slate-400">
                      {playerStats.roundScores[idx] ?? 0}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Boutons d'action Post-Mortem empilés sur mobile */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-4 pt-2 font-mono w-full">
            <button
              type="button"
              disabled={!isOnline || isBannedFromQueue}
              onClick={handleSwitchToMatchmaking}
              className={`w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2 rounded-xl border px-5 sm:px-6 py-3 sm:py-3.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                isBannedFromQueue
                  ? 'opacity-60 cursor-not-allowed border-rose-700 bg-rose-950/60 text-rose-300'
                  : !isOnline
                    ? 'opacity-50 cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-500'
                    : 'border-emerald-500 bg-emerald-500 text-slate-950 shadow-[0_0_25px_rgba(34,197,94,0.35)] hover:bg-emerald-400 hover:shadow-[0_0_35px_rgba(34,197,94,0.5)] active:scale-[0.98]'
              }`}
            >
              <span>⚡</span>
              <span>
                {isBannedFromQueue
                  ? `Bannissement temporaire actif : ${queueCooldownRemaining}s restant(s)`
                  : 'REJOUER EN LIGNE (1v1)'}
              </span>
              {!isOnline && !isBannedFromQueue && (
                <span className="text-[10px] sm:text-xs text-amber-300 font-normal">
                  (Hors-ligne)
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleSwitchToBot}
              className={`w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2 rounded-xl border px-5 sm:px-6 py-3 sm:py-3.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                !isOnline
                  ? 'border-2 border-amber-400 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-amber-950/60 text-amber-200 shadow-[0_0_25px_rgba(251,191,36,0.4)] animate-pulse'
                  : 'border-purple-500/50 bg-purple-950/60 text-purple-300 hover:bg-purple-900/60 active:scale-[0.98]'
              }`}
            >
              <span>🤖</span>
              <span>S&apos;ENTRAÎNER VS DEVBOT</span>
              {!isOnline && (
                <span className="rounded border border-amber-400/60 bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300">
                  RECOMMANDÉ
                </span>
              )}
            </button>

            <Link
              href="/"
              className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-5 sm:px-6 py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-slate-300 transition-all hover:bg-slate-800 hover:text-white active:scale-[0.98]"
            >
              <span>←</span>
              <span>QUITTER L&apos;ARÈNE</span>
            </Link>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE ANTI-TRICHE : AVERTISSEMENT PERTE DE FOCUS (1/2)  */}
      {/* ======================================================== */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border-2 border-rose-500 bg-gradient-to-b from-slate-950 via-rose-950/50 to-slate-950 p-6 sm:p-7 font-mono shadow-[0_0_50px_rgba(244,63,94,0.5)]">
            <div className="flex items-center gap-3 border-b border-rose-500/40 pb-4 text-rose-400">
              <span className="text-2xl animate-bounce">⚠️</span>
              <h3 className="text-sm sm:text-base font-black tracking-wider text-rose-200">
                ALERTE SÉCURITÉ : PERTE DE FOCUS DÉTECTÉE (1/2)
              </h3>
            </div>
            <div className="my-4 sm:my-5 space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>
                Le changement d&apos;onglet ou la perte de focus est{' '}
                <strong className="text-rose-400 uppercase">strictement interdit</strong> en arène compétitive.
              </p>
              <div className="rounded-lg border border-rose-500/40 bg-rose-950/60 p-3 sm:p-3.5 text-xs text-rose-200 shadow-inner">
                ⚠️ <strong>Avertissement 1 sur 2 :</strong> Une seconde infraction entraînera une défaite immédiate par forfait et un bannissement temporaire de la file compétitive.
              </div>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={dismissWarning}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(244,63,94,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                REVENIR DANS L&apos;ARÈNE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DuelArena;
