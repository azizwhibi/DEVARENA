'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export const QUEUE_COOLDOWN_STORAGE_KEY = 'duel_queue_cooldown_until';

/**
 * Lit le temps restant (en secondes) sur le bannissement temporaire de la file.
 */
export function getQueueCooldownRemaining(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(QUEUE_COOLDOWN_STORAGE_KEY);
    if (!raw) return 0;
    const until = Number.parseInt(raw, 10);
    if (Number.isNaN(until)) return 0;
    const diffMs = until - Date.now();
    return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
  } catch {
    return 0;
  }
}

/**
 * Enregistre un bannissement temporaire de la file de matchmaking (par défaut 60s).
 */
export function setQueueCooldown(durationMs: number = 60000): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUEUE_COOLDOWN_STORAGE_KEY, String(Date.now() + durationMs));
  } catch {}
}

export interface UseDuelAntiCheatOptions {
  /**
   * Doit être vrai uniquement pendant les rounds actifs de combat (ex: duelState === 'READING' || duelState === 'RESOLUTION')
   */
  isActive: boolean;
  /**
   * Déclenché lors de la 2ème infraction : forfeit immédiat
   */
  onForfeit: () => void;
}

export interface UseDuelAntiCheatReturn {
  tabSwitchCount: number;
  showWarningModal: boolean;
  dismissWarning: () => void;
  resetAntiCheat: () => void;
  queueCooldownRemaining: number;
  isBannedFromQueue: boolean;
}

export function useDuelAntiCheat({
  isActive,
  onForfeit,
}: UseDuelAntiCheatOptions): UseDuelAntiCheatReturn {
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [queueCooldownRemaining, setQueueCooldownRemaining] = useState<number>(() =>
    getQueueCooldownRemaining(),
  );

  const lastTriggerTimeRef = useRef<number>(0);
  const onForfeitRef = useRef(onForfeit);
  useEffect(() => {
    onForfeitRef.current = onForfeit;
  }, [onForfeit]);

  // 1. Minuteur de compte à rebours pour le bannissement de file (1s tick)
  useEffect(() => {
    const updateCooldown = () => {
      const remaining = getQueueCooldownRemaining();
      setQueueCooldownRemaining(remaining);
      return remaining;
    };

    updateCooldown();

    const interval = setInterval(() => {
      const rem = updateCooldown();
      if (rem <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarningModal, tabSwitchCount]);

  // 2. Écouteurs Anti-Triche actifs uniquement pendant le combat (isActive = true)
  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;

    // A. Interception des événements de copie, sélection, glisser-déposer et menu contextuel
    const blockCopyEvents = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      return false;
    };

    // B. Blocage strict des raccourcis clavier (Ctrl+C, Cmd+C, Ctrl+A, Ctrl+X, Ctrl+U, Ctrl+S, F12, DevTools)
    const blockKeyCombos = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        ((e.ctrlKey || e.metaKey) && ['c', 'x', 'a', 'u', 's'].includes(key)) ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // C. Détection perte de focus et bascule d'onglet
    const handleFocusLoss = () => {
      const now = Date.now();
      // Debounce de 1500ms pour éviter le double déclenchement blur + visibilitychange lors d'un même alt-tab
      if (now - lastTriggerTimeRef.current < 1500) {
        return;
      }
      lastTriggerTimeRef.current = now;

      setTabSwitchCount((prev) => {
        const nextCount = prev + 1;
        if (nextCount === 1) {
          setShowWarningModal(true);
        } else if (nextCount >= 2) {
          setShowWarningModal(false);
          // Bannissement temporaire d'1 minute (60s)
          setQueueCooldown(60000);
          setQueueCooldownRemaining(60);
          onForfeitRef.current?.();
        }
        return nextCount;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleFocusLoss();
      }
    };

    const handleWindowBlur = () => {
      handleFocusLoss();
    };

    window.addEventListener('copy', blockCopyEvents, true);
    window.addEventListener('cut', blockCopyEvents, true);
    window.addEventListener('contextmenu', blockCopyEvents, true);
    window.addEventListener('selectstart', blockCopyEvents, true);
    window.addEventListener('dragstart', blockCopyEvents, true);
    window.addEventListener('keydown', blockKeyCombos, true);
    document.addEventListener('copy', blockCopyEvents, true);
    document.addEventListener('cut', blockCopyEvents, true);
    document.addEventListener('contextmenu', blockCopyEvents, true);
    document.addEventListener('selectstart', blockCopyEvents, true);
    document.addEventListener('dragstart', blockCopyEvents, true);
    document.addEventListener('keydown', blockKeyCombos, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('copy', blockCopyEvents, true);
      window.removeEventListener('cut', blockCopyEvents, true);
      window.removeEventListener('contextmenu', blockCopyEvents, true);
      window.removeEventListener('selectstart', blockCopyEvents, true);
      window.removeEventListener('dragstart', blockCopyEvents, true);
      window.removeEventListener('keydown', blockKeyCombos, true);
      document.removeEventListener('copy', blockCopyEvents, true);
      document.removeEventListener('cut', blockCopyEvents, true);
      document.removeEventListener('contextmenu', blockCopyEvents, true);
      document.removeEventListener('selectstart', blockCopyEvents, true);
      document.removeEventListener('dragstart', blockCopyEvents, true);
      document.removeEventListener('keydown', blockKeyCombos, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isActive]);

  const dismissWarning = useCallback(() => {
    setShowWarningModal(false);
  }, []);

  const resetAntiCheat = useCallback(() => {
    setTabSwitchCount(0);
    setShowWarningModal(false);
  }, []);

  return {
    tabSwitchCount,
    showWarningModal,
    dismissWarning,
    resetAntiCheat,
    queueCooldownRemaining,
    isBannedFromQueue: queueCooldownRemaining > 0,
  };
}
