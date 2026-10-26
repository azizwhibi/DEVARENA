'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_DUEL_QUESTIONS } from '@/lib/duelQuestions';
import {
  addResult,
  calculatePoints,
  initialBattle,
  receiveBattle,
  ROUND_TIME_MS,
  type BattleState,
} from '@/lib/duelState';
import type { DuelServerEvent, PlayerRoundResult } from '@/types/duel';
import { parseRankPromotion } from '@/lib/rankings';

function soloResult(
  index: number | null,
  correct: number,
  remaining: number,
): PlayerRoundResult {
  return {
    selectedIndex: index,
    isCorrect: index === correct,
    timeRemainingMs: Math.max(0, remaining),
    pointsEarned: calculatePoints(index === correct, remaining),
  };
}
function resolveSolo(
  state: BattleState,
  player: PlayerRoundResult,
  opponent: PlayerRoundResult,
): BattleState {
  return {
    ...state,
    phase: 'resolution',
    answer: player.selectedIndex,
    correctIndex: DEFAULT_DUEL_QUESTIONS[state.round].correctIndex,
    player: addResult(state.player, player),
    opponent: addResult(state.opponent, opponent),
    rounds: [...state.rounds, { player, opponent }],
  };
}
function soloRound(state: BattleState, round: number): BattleState {
  const q = DEFAULT_DUEL_QUESTIONS[round];
  return {
    ...state,
    phase: 'reading',
    round,
    question: {
      id: q.id,
      prompt: q.prompt,
      snippet: q.snippet,
      options: q.options,
    },
    remaining: ROUND_TIME_MS,
    deadline: Date.now() + ROUND_TIME_MS,
    answer: null,
    opponentAnswered: false,
    correctIndex: null,
  };
}

export function useQuizDuel(playerId: string, playerName: string) {
  const [state, setState] = useState(() => initialBattle(playerName));
  const [joining, setJoining] = useState(false);
  const socket = useRef<WebSocket | null>(null);
  const generation = useRef(0);
  const submitted = useRef(false);
  const soloPlayer = useRef<PlayerRoundResult | null>(null),
    soloBot = useRef<PlayerRoundResult | null>(null);
  const send = useCallback((type: string, payload?: object) => {
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify({ type, payload }));
  }, []);
  const stop = useCallback(() => {
    generation.current++;
    const previous = socket.current;
    socket.current = null;
    if (previous) {
      previous.onclose = null;
      previous.onmessage = null;
      previous.close();
    }
  }, []);
  useEffect(() => () => stop(), [stop]);
  useEffect(() => {
    if (!['reading', 'proposed'].includes(state.phase)) return;
    const tick = window.setInterval(
      () =>
        setState((current) => {
          const remaining = Math.max(0, current.deadline - Date.now());
          if (
            current.mode === 'solo' &&
            current.phase === 'reading' &&
            remaining === 0
          ) {
            const correct = DEFAULT_DUEL_QUESTIONS[current.round].correctIndex;
            return resolveSolo(
              current,
              soloPlayer.current ?? soloResult(null, correct, 0),
              soloBot.current ?? soloResult(null, correct, 0),
            );
          }
          return { ...current, remaining };
        }),
      100,
    );
    return () => clearInterval(tick);
  }, [state.phase, state.round]);
  useEffect(() => {
    if (state.phase !== 'reading') return;
    submitted.current = false;
    soloPlayer.current = null;
    soloBot.current = null;
    if (state.mode !== 'solo') return;
    const timer = window.setTimeout(
      () => {
        const correct = DEFAULT_DUEL_QUESTIONS[state.round].correctIndex;
        const selected =
          Math.random() < 0.7
            ? correct
            : (correct + 1 + Math.floor(Math.random() * 3)) % 4;
        const bot = soloResult(selected, correct, state.deadline - Date.now());
        soloBot.current = bot;
        const player = soloPlayer.current;
        setState((current) => {
          if (current.phase !== 'reading') return current;
          return player
            ? resolveSolo(current, player, bot)
            : { ...current, opponentAnswered: true };
        });
      },
      1500 + Math.random() * 6500,
    );
    return () => clearTimeout(timer);
  }, [state.phase, state.round, state.mode, state.deadline]);
  useEffect(() => {
    if (state.mode !== 'solo' || state.phase !== 'resolution') return;
    const timer = window.setTimeout(
      () =>
        setState((current) => {
          if (current.round + 1 < current.total)
            return soloRound(current, current.round + 1);
          return {
            ...current,
            phase: 'finished',
            winnerId:
              current.player.totalScore === current.opponent.totalScore
                ? null
                : current.player.totalScore > current.opponent.totalScore
                  ? playerId
                  : 'bot',
          };
        }),
      2000,
    );
    return () => clearTimeout(timer);
  }, [state.mode, state.phase, state.round, playerId]);

  async function startOnline() {
    if (joining) return;
    stop();
    const run = ++generation.current;
    setJoining(true);
    setState({ ...initialBattle(playerName), phase: 'connecting' });
    try {
      if (!navigator.onLine)
        throw new Error('You are offline. Reconnect to find an opponent.');
      const { data, error } = await createClient().auth.getSession();
      if (error || !data.session)
        throw new Error('Sign in again to join a battle.');
      if (run !== generation.current) return;
      const base =
        process.env.NEXT_PUBLIC_DUEL_WS_URL || process.env.NEXT_PUBLIC_API_URL;
      if (!base) throw new Error('Battle service is not configured.');
      const url = new URL(base);
      url.protocol =
        url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
      url.pathname = '/duel';
      url.search = '';
      url.hash = '';
      const ws = new WebSocket(url.toString());
      socket.current = ws;
      ws.onopen = () =>
        ws.send(
          JSON.stringify({
            type: 'DUEL_AUTH',
            payload: { token: data.session!.access_token },
          }),
        );
      ws.onmessage = (event) => {
        if (socket.current !== ws) return;
        try {
          const message = JSON.parse(event.data) as
            | DuelServerEvent
            | { event: 'rank_promoted'; data: unknown }
            | { type: 'DUEL_AUTHENTICATED'; payload: { playerId: string } };
          if ('event' in message) {
            if (message.event === 'rank_promoted') {
              const promotion = parseRankPromotion(message.data);
              if (promotion)
                window.dispatchEvent(
                  new CustomEvent('rank_promoted', { detail: promotion }),
                );
            }
            return;
          }
          if (message.type === 'DUEL_AUTHENTICATED') {
            if (message.payload.playerId !== playerId) {
              ws.close();
              return;
            }
            send('DUEL_JOIN');
            return;
          }
          if (message.type === 'DUEL_ROUND_START') submitted.current = false;
          setState((current) =>
            receiveBattle(current, message, playerId, Date.now()),
          );
        } catch {
          setState((current) => ({
            ...current,
            error: 'An invalid battle update was received.',
          }));
        }
      };
      ws.onerror = () =>
        setState((current) => ({
          ...current,
          error:
            'Unable to connect to the battle server. Retry when it is available.',
        }));
      ws.onclose = (event) => {
        if (socket.current !== ws) return;
        socket.current = null;
        setState((current) =>
          current.phase === 'finished'
            ? current
            : {
                ...current,
                phase: 'idle',
                error:
                  event.code === 4409
                    ? 'This account is already connected in another tab.'
                    : event.code === 4401
                      ? 'Your session expired. Sign in again.'
                      : event.code === 4403
                        ? 'A developer account is required.'
                        : 'Connection closed. Find another opponent to retry.',
              },
        );
      };
    } catch (error) {
      if (run === generation.current)
        setState((current) => ({
          ...current,
          phase: 'idle',
          error:
            error instanceof Error
              ? error.message
              : 'Battle service unavailable.',
        }));
    } finally {
      if (run === generation.current) setJoining(false);
    }
  }
  function startSolo() {
    stop();
    setJoining(false);
    setState(
      soloRound(
        {
          ...initialBattle(playerName),
          mode: 'solo',
          opponent: { ...initialBattle(playerName).opponent, name: 'DevBot' },
        },
        0,
      ),
    );
  }
  function answer(index: number) {
    if (
      state.phase !== 'reading' ||
      submitted.current ||
      state.remaining <= 0 ||
      !Number.isInteger(index) ||
      index < 0 ||
      index > 3
    )
      return;
    if (
      state.mode === 'online' &&
      socket.current?.readyState !== WebSocket.OPEN
    )
      return;
    submitted.current = true;
    if (state.mode === 'online') {
      send('DUEL_SUBMIT_ANSWER', {
        duelId: state.duelId,
        roundIndex: state.round,
        questionId: state.question!.id,
        selectedIndex: index,
      });
      setState((current) => ({ ...current, answer: index }));
    } else {
      const correct = DEFAULT_DUEL_QUESTIONS[state.round].correctIndex;
      const result = soloResult(index, correct, state.deadline - Date.now());
      soloPlayer.current = result;
      const bot = soloBot.current;
      setState((current) =>
        bot ? resolveSolo(current, result, bot) : { ...current, answer: index },
      );
    }
  }
  function leave() {
    send('DUEL_QUEUE_LEAVE');
    stop();
    setJoining(false);
    setState(initialBattle(playerName));
  }
  return {
    state,
    startOnline,
    startSolo,
    answer,
    leave,
    accept: () => send('DUEL_MATCH_ACCEPT', { duelId: state.duelId }),
    decline: () => {
      send('DUEL_MATCH_DECLINE', { duelId: state.duelId });
      stop();
      setState(initialBattle(playerName));
    },
  };
}
