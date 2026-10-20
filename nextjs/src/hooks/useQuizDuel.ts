'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  DuelClientEvent,
  DuelDriverType,
  DuelServerEvent,
  DuelState,
  PlayerRoundResult,
  PlayerStats,
  Question,
  UseQuizDuelOptions,
  UseQuizDuelReturn,
} from '@/types/duel';
import { DEFAULT_DUEL_QUESTIONS } from '@/lib/duelMockQuestions';
import { createClient } from '@/lib/supabase/client';

export const ROUND_TIME_MS = 10000;
export const RESOLUTION_TIME_MS = 2000;
export const TICK_INTERVAL_MS = 50;
export const BASE_POINTS = 500;
export const MAX_VELOCITY_BONUS = 500;
export const TOTAL_QUESTIONS = 10;
export const BOT_MIN_DELAY_MS = 1500;
export const BOT_MAX_DELAY_MS = 8000;
export const BOT_ACCURACY = 0.65;

/**
 * Calcule les points d'un round :
 * - 0 si la réponse est fausse ou en timeout
 * - 500 pts fixes + bonus de vélocité jusqu'à 500 pts (formule : (remainingMs / 10000) * 500)
 */
export function calculatePoints(isCorrect: boolean, timeRemainingMs: number): number {
  if (!isCorrect) return 0;
  const clampedTime = Math.max(0, Math.min(ROUND_TIME_MS, timeRemainingMs));
  const velocityBonus = Math.round((clampedTime / ROUND_TIME_MS) * MAX_VELOCITY_BONUS);
  return BASE_POINTS + velocityBonus;
}

/**
 * Simule la réponse de l'adversaire autonome (mode 'local_bot') :
 * - ~65% de précision
 * - En cas d'erreur, choix uniforme parmi les 3 réponses incorrectes
 */
function simulateBotAnswer(question: Question): { isCorrect: boolean; selectedIndex: number } {
  const isCorrect = Math.random() < BOT_ACCURACY;
  if (isCorrect) {
    return { isCorrect: true, selectedIndex: question.correctIndex };
  }

  const wrongIndices = ([0, 1, 2, 3] as const).filter((idx) => idx !== question.correctIndex);
  const randomWrongIndex = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
  return { isCorrect: false, selectedIndex: randomWrongIndex };
}

/**
 * Génère un délai aléatoire pour l'adversaire local entre 1.5s et 8s.
 */
function getRandomBotDelay(): number {
  return Math.floor(Math.random() * (BOT_MAX_DELAY_MS - BOT_MIN_DELAY_MS + 1)) + BOT_MIN_DELAY_MS;
}

export function useQuizDuel({
  questions = DEFAULT_DUEL_QUESTIONS,
  playerName = 'Joueur 1',
  opponentName = 'DevBot Rival',
  autoStart = true,
  driver: initialDriver = 'local_bot',
  socketUrl,
  duelId = 'duel-session',
  onRoundComplete,
  onFinish,
}: UseQuizDuelOptions = {}): UseQuizDuelReturn {
  const [activeDriver, setActiveDriver] = useState<DuelDriverType>(initialDriver);
  const activeQuestions = useMemo(() => questions.slice(0, TOTAL_QUESTIONS), [questions]);

  const [duelState, setDuelState] = useState<DuelState>(autoStart ? 'READING' : 'READING');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [serverQuestion, setServerQuestion] = useState<Question | null>(null);
  const [timeRemainingMs, setTimeRemainingMs] = useState<number>(ROUND_TIME_MS);

  const [playerRoundResult, setPlayerRoundResult] = useState<PlayerRoundResult | null>(null);
  const [opponentRoundResult, setOpponentRoundResult] = useState<PlayerRoundResult | null>(null);

  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    name: playerName,
    totalScore: 0,
    correctAnswers: 0,
    totalResponseTimeMs: 0,
    roundScores: [],
  });

  const [opponentStats, setOpponentStats] = useState<PlayerStats>({
    name: opponentName,
    totalScore: 0,
    correctAnswers: 0,
    totalResponseTimeMs: 0,
    roundScores: [],
  });

  // États pour le matchmaking réseau
  const [isSearchingMatch, setIsSearchingMatch] = useState<boolean>(false);
  const [searchDurationSeconds, setSearchDurationSeconds] = useState<number>(0);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // États pour la phase Ready Check ("Accept & Decline")
  const [isMatchProposed, setIsMatchProposed] = useState<boolean>(false);
  const [hasAcceptedMatch, setHasAcceptedMatch] = useState<boolean>(false);
  const [hasOpponentAccepted, setHasOpponentAccepted] = useState<boolean>(false);
  const [matchAcceptTimeRemainingMs, setMatchAcceptTimeRemainingMs] = useState<number>(10000);
  const [proposedOpponent, setProposedOpponent] = useState<{
    id: string;
    name: string;
    avatarUrl?: string;
  } | null>(null);

  // Références d'état synchronisées
  const duelStateRef = useRef<DuelState>(duelState);
  const currentQuestionIndexRef = useRef<number>(currentQuestionIndex);
  const activeQuestionsRef = useRef<Question[]>(activeQuestions);
  const roundStartTimeRef = useRef<number>(0);
  const isResolvingRef = useRef<boolean>(false);
  const currentDuelIdRef = useRef<string>(duelId);

  const playerAnswerRef = useRef<PlayerRoundResult | null>(null);
  const opponentAnswerRef = useRef<PlayerRoundResult | null>(null);

  const resolveRoundRef = useRef<
    ((playerRes: PlayerRoundResult, opponentRes: PlayerRoundResult) => void) | null
  >(null);

  const webSocketRef = useRef<WebSocket | null>(null);
  const onRoundCompleteRef = useRef(onRoundComplete);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    duelStateRef.current = duelState;
  }, [duelState]);

  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  useEffect(() => {
    activeQuestionsRef.current = activeQuestions;
  }, [activeQuestions]);

  useEffect(() => {
    onRoundCompleteRef.current = onRoundComplete;
    onFinishRef.current = onFinish;
  }, [onRoundComplete, onFinish]);

  // Question active : priorité à la question reçue de l'arbitre serveur si en mode websocket
  const currentQuestion = useMemo(() => {
    if (activeDriver === 'websocket' && serverQuestion) {
      return serverQuestion;
    }
    return activeQuestions[currentQuestionIndex] ?? null;
  }, [activeDriver, serverQuestion, activeQuestions, currentQuestionIndex]);

  const currentQuestionRef = useRef<Question | null>(currentQuestion);
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  // Synchronisation du nom du joueur
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setPlayerStats((prev) => (prev.name === playerName ? prev : { ...prev, name: playerName }));
    });
    return () => cancelAnimationFrame(frame);
  }, [playerName]);

  // Compteur de temps de recherche en matchmaking
  useEffect(() => {
    if (!isSearchingMatch) return;
    const timer = setInterval(() => {
      setSearchDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(timer);
      setSearchDurationSeconds(0);
    };
  }, [isSearchingMatch]);

  // Compteur pour le Ready Check de 10 secondes
  useEffect(() => {
    if (!isMatchProposed) return;
    const interval = setInterval(() => {
      setMatchAcceptTimeRemainingMs((prev) => Math.max(0, prev - 100));
    }, 100);
    return () => {
      clearInterval(interval);
      setMatchAcceptTimeRemainingMs(10000);
    };
  }, [isMatchProposed]);

  /**
   * Initialisation et gestion robuste de la WebSocket (PHASE 2)
   */
  useEffect(() => {
    if (activeDriver !== 'websocket' || typeof window === 'undefined') return;

    let isSubscribed = true;
    let socket: WebSocket | null = null;

    async function initSocketConnection() {
      setConnectionStatus('connecting');
      setErrorMessage(null);

      // 1. Récupération du JWT Supabase si disponible
      let token: string | undefined;
      let effectivePlayerId: string = 'player-1';
      let effectivePlayerName: string = playerName;

      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          token = data.session.access_token;
          effectivePlayerId = data.session.user.id;
          effectivePlayerName =
            data.session.user.user_metadata?.username ||
            data.session.user.email?.split('@')[0] ||
            playerName;
        }
      } catch {
        // Mode offline/guest fallback
      }

      if (!isSubscribed) return;

      // 2. Construction de l'URL cible avec query params pour la négociation
      const baseUrl =
        socketUrl ||
        process.env.NEXT_PUBLIC_DUEL_WS_URL ||
        process.env.NEXT_PUBLIC_WS_URL ||
        'ws://localhost:3000/duel';

      let resolvedUrl: string;
      try {
        const parsed = new URL(baseUrl, window.location.origin.replace(/^http/, 'ws'));
        if (token) parsed.searchParams.set('token', token);
        parsed.searchParams.set('playerName', effectivePlayerName);
        parsed.searchParams.set('playerId', effectivePlayerId);
        resolvedUrl = parsed.toString();
      } catch {
        resolvedUrl = baseUrl;
      }

      try {
        socket = new WebSocket(resolvedUrl);
        webSocketRef.current = socket;

        socket.onopen = () => {
          if (!isSubscribed) return;
          setConnectionStatus('connected');
          setIsSearchingMatch(true);

          const joinMsg: DuelClientEvent = {
            type: 'DUEL_JOIN',
            payload: {
              duelId: currentDuelIdRef.current || duelId,
              playerId: effectivePlayerId,
              playerName: effectivePlayerName,
            },
          };
          socket?.send(JSON.stringify(joinMsg));
        };

        socket.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const serverEvent: DuelServerEvent = JSON.parse(event.data);
            switch (serverEvent.type) {
              case 'DUEL_QUEUE_WAITING': {
                setIsSearchingMatch(true);
                setIsMatchProposed(false);
                setQueuePosition(serverEvent.payload.position);
                break;
              }

              case 'DUEL_MATCH_FOUND': {
                setIsSearchingMatch(false);
                currentDuelIdRef.current = serverEvent.payload.duelId;
                if (serverEvent.payload.opponent?.name) {
                  setOpponentStats((prev) => ({
                    ...prev,
                    name: serverEvent.payload.opponent.name,
                  }));
                }
                if (serverEvent.payload.player?.name) {
                  setPlayerStats((prev) => ({
                    ...prev,
                    name: serverEvent.payload.player.name,
                  }));
                }
                break;
              }

              case 'DUEL_MATCH_PROPOSED': {
                setIsSearchingMatch(false);
                setIsMatchProposed(true);
                setHasAcceptedMatch(false);
                setHasOpponentAccepted(false);
                currentDuelIdRef.current = serverEvent.payload.duelId;
                setProposedOpponent(serverEvent.payload.opponent);
                setMatchAcceptTimeRemainingMs(serverEvent.payload.timeoutMs || 10000);
                if (serverEvent.payload.opponent?.name) {
                  setOpponentStats((prev) => ({
                    ...prev,
                    name: serverEvent.payload.opponent.name,
                  }));
                }
                break;
              }

              case 'DUEL_MATCH_ACCEPTED_UPDATE': {
                const acceptedIds = serverEvent.payload.acceptedPlayerIds || [];
                if (effectivePlayerId && acceptedIds.includes(effectivePlayerId)) {
                  setHasAcceptedMatch(true);
                }
                const hasOpp = acceptedIds.some((id) => id !== effectivePlayerId);
                if (hasOpp) {
                  setHasOpponentAccepted(true);
                }
                break;
              }

              case 'DUEL_MATCH_CANCELLED': {
                setIsMatchProposed(false);
                setHasAcceptedMatch(false);
                setHasOpponentAccepted(false);
                setProposedOpponent(null);
                if (serverEvent.payload.reason === 'declined') {
                  const wasDeclinedByMe =
                    serverEvent.payload.byPlayerId &&
                    serverEvent.payload.byPlayerId === effectivePlayerId;
                  if (wasDeclinedByMe) {
                    setErrorMessage('Match refusé. Vous avez quitté la file.');
                    setIsSearchingMatch(false);
                    setActiveDriver('local_bot');
                  } else {
                    setErrorMessage(
                      'L’adversaire a refusé le match. Vous êtes replacé en tête de file...',
                    );
                    setIsSearchingMatch(true);
                  }
                } else if (serverEvent.payload.reason === 'timeout') {
                  setErrorMessage('Temps de confirmation écoulé (10s). Match annulé.');
                }
                break;
              }

              case 'DUEL_ROUND_START': {
                setIsSearchingMatch(false);
                setIsMatchProposed(false);
                setHasAcceptedMatch(false);
                setHasOpponentAccepted(false);
                setProposedOpponent(null);

                isResolvingRef.current = false;
                playerAnswerRef.current = null;
                opponentAnswerRef.current = null;

                currentDuelIdRef.current = serverEvent.payload.duelId;
                setCurrentQuestionIndex(serverEvent.payload.roundIndex);
                currentQuestionIndexRef.current = serverEvent.payload.roundIndex;

                setServerQuestion(serverEvent.payload.question);
                currentQuestionRef.current = serverEvent.payload.question;

                setPlayerRoundResult(null);
                setOpponentRoundResult(null);

                setTimeRemainingMs(serverEvent.payload.roundDurationMs);
                roundStartTimeRef.current = Date.now();

                setDuelState('READING');
                duelStateRef.current = 'READING';
                break;
              }

              case 'DUEL_OPPONENT_ANSWERED': {
                const oppRemaining = serverEvent.payload.timeRemainingMs;
                // SelectedIndex masqué par le serveur pour éviter la triche (reçu undefined)
                const oppResult: PlayerRoundResult = {
                  selectedIndex: serverEvent.payload.selectedIndex ?? null,
                  timeRemainingMs: oppRemaining,
                  pointsEarned: 0,
                  isCorrect: false,
                };
                opponentAnswerRef.current = oppResult;
                setOpponentRoundResult(oppResult);
                break;
              }

              case 'DUEL_ROUND_RESOLVE': {
                isResolvingRef.current = true;
                setDuelState('RESOLUTION');
                duelStateRef.current = 'RESOLUTION';

                setPlayerRoundResult(serverEvent.payload.playerResult);
                setOpponentRoundResult(serverEvent.payload.opponentResult);

                setPlayerStats((prev) => ({
                  ...prev,
                  totalScore: serverEvent.payload.playerTotalScore,
                  roundScores: [
                    ...prev.roundScores,
                    serverEvent.payload.playerResult.pointsEarned,
                  ],
                  correctAnswers:
                    prev.correctAnswers +
                    (serverEvent.payload.playerResult.isCorrect ? 1 : 0),
                  totalResponseTimeMs:
                    prev.totalResponseTimeMs +
                    (ROUND_TIME_MS - serverEvent.payload.playerResult.timeRemainingMs),
                }));

                setOpponentStats((prev) => ({
                  ...prev,
                  totalScore: serverEvent.payload.opponentTotalScore,
                  roundScores: [
                    ...prev.roundScores,
                    serverEvent.payload.opponentResult.pointsEarned,
                  ],
                  correctAnswers:
                    prev.correctAnswers +
                    (serverEvent.payload.opponentResult.isCorrect ? 1 : 0),
                  totalResponseTimeMs:
                    prev.totalResponseTimeMs +
                    (ROUND_TIME_MS - serverEvent.payload.opponentResult.timeRemainingMs),
                }));

                onRoundCompleteRef.current?.({
                  questionIndex: serverEvent.payload.roundIndex,
                  playerResult: serverEvent.payload.playerResult,
                  opponentResult: serverEvent.payload.opponentResult,
                });
                break;
              }

              case 'DUEL_MATCH_END': {
                setDuelState('FINISHED');
                duelStateRef.current = 'FINISHED';

                if (serverEvent.payload.finalStats) {
                  setPlayerStats(serverEvent.payload.finalStats.player);
                  setOpponentStats(serverEvent.payload.finalStats.opponent);
                  onFinishRef.current?.(serverEvent.payload.finalStats);
                }
                break;
              }

              case 'DUEL_ERROR': {
                setErrorMessage(serverEvent.payload.message);
                if (serverEvent.payload.code === 'OPPONENT_DISCONNECTED') {
                  setDuelState('FINISHED');
                  duelStateRef.current = 'FINISHED';
                }
                break;
              }
            }
          } catch {
            // Ignorer erreur d'analyse JSON
          }
        };

        socket.onerror = () => {
          if (!isSubscribed) return;
          setConnectionStatus('error');
          setErrorMessage('Connexion au serveur de duel interrompue.');
        };

        socket.onclose = () => {
          if (!isSubscribed) return;
          setConnectionStatus('disconnected');
          setIsSearchingMatch(false);
        };
      } catch {
        setConnectionStatus('error');
        setErrorMessage('Impossible d’établir la connexion WebSocket.');
      }
    }

    void initSocketConnection();

    return () => {
      isSubscribed = false;
      if (socket) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'DUEL_QUEUE_LEAVE' }));
        }
        socket.close();
      }
      webSocketRef.current = null;
    };
  }, [activeDriver, socketUrl, duelId, playerName]);

  // Boucle d'horloge locale en phase 'READING'
  useEffect(() => {
    if (duelState !== 'READING') return;

    const q = currentQuestionRef.current;
    if (!q) {
      if (activeDriver === 'local_bot') {
        const frame = requestAnimationFrame(() => {
          setDuelState('FINISHED');
          duelStateRef.current = 'FINISHED';
        });
        return () => cancelAnimationFrame(frame);
      }
      return;
    }

    isResolvingRef.current = false;
    playerAnswerRef.current = null;
    opponentAnswerRef.current = null;

    const isBotDriver = activeDriver === 'local_bot';
    const botSim = isBotDriver ? simulateBotAnswer(q) : { isCorrect: false, selectedIndex: 0 };
    const botDelay = isBotDriver ? getRandomBotDelay() : Infinity;
    let botAnswered = false;

    roundStartTimeRef.current = Date.now();

    function resolveRoundLocal(finalPlayer: PlayerRoundResult, finalOpponent: PlayerRoundResult) {
      if (isResolvingRef.current) return;
      isResolvingRef.current = true;

      clearInterval(tickInterval);

      setDuelState('RESOLUTION');
      duelStateRef.current = 'RESOLUTION';

      setPlayerRoundResult(finalPlayer);
      setOpponentRoundResult(finalOpponent);

      const playerRespTime = ROUND_TIME_MS - finalPlayer.timeRemainingMs;
      const opponentRespTime = ROUND_TIME_MS - finalOpponent.timeRemainingMs;

      setPlayerStats((prev) => ({
        ...prev,
        totalScore: prev.totalScore + finalPlayer.pointsEarned,
        correctAnswers: prev.correctAnswers + (finalPlayer.isCorrect ? 1 : 0),
        totalResponseTimeMs: prev.totalResponseTimeMs + playerRespTime,
        roundScores: [...prev.roundScores, finalPlayer.pointsEarned],
      }));

      setOpponentStats((prev) => ({
        ...prev,
        totalScore: prev.totalScore + finalOpponent.pointsEarned,
        correctAnswers: prev.correctAnswers + (finalOpponent.isCorrect ? 1 : 0),
        totalResponseTimeMs: prev.totalResponseTimeMs + opponentRespTime,
        roundScores: [...prev.roundScores, finalOpponent.pointsEarned],
      }));

      onRoundCompleteRef.current?.({
        questionIndex: currentQuestionIndexRef.current,
        playerResult: finalPlayer,
        opponentResult: finalOpponent,
      });

      // Gel de 2 secondes en local
      setTimeout(() => {
        const nextIdx = currentQuestionIndexRef.current + 1;
        const total = activeQuestionsRef.current.length;

        if (nextIdx < total) {
          setCurrentQuestionIndex(nextIdx);
          currentQuestionIndexRef.current = nextIdx;
          setPlayerRoundResult(null);
          setOpponentRoundResult(null);
          setTimeRemainingMs(ROUND_TIME_MS);
          setDuelState('READING');
          duelStateRef.current = 'READING';
        } else {
          setDuelState('FINISHED');
          duelStateRef.current = 'FINISHED';

          setPlayerStats((pStats) => {
            setOpponentStats((oStats) => {
              onFinishRef.current?.({ player: pStats, opponent: oStats });
              return oStats;
            });
            return pStats;
          });
        }
      }, RESOLUTION_TIME_MS);
    }

    resolveRoundRef.current = resolveRoundLocal;

    const tickInterval = setInterval(() => {
      if (isResolvingRef.current) return;

      const now = Date.now();
      const elapsed = now - roundStartTimeRef.current;
      const remaining = Math.max(0, ROUND_TIME_MS - elapsed);

      setTimeRemainingMs(remaining);

      // Simulation du DevBot en local
      if (isBotDriver && !botAnswered && elapsed >= botDelay) {
        botAnswered = true;
        const oppRemaining = Math.max(0, ROUND_TIME_MS - botDelay);
        const oppPoints = calculatePoints(botSim.isCorrect, oppRemaining);

        const oppResult: PlayerRoundResult = {
          selectedIndex: botSim.selectedIndex,
          timeRemainingMs: oppRemaining,
          pointsEarned: oppPoints,
          isCorrect: botSim.isCorrect,
        };

        opponentAnswerRef.current = oppResult;
        setOpponentRoundResult(oppResult);

        if (playerAnswerRef.current !== null) {
          resolveRoundLocal(playerAnswerRef.current, oppResult);
          return;
        }
      }

      // Timeout du round en mode bot local
      if (isBotDriver && remaining <= 0) {
        const timeoutPlayerResult: PlayerRoundResult = playerAnswerRef.current ?? {
          selectedIndex: null,
          timeRemainingMs: 0,
          pointsEarned: 0,
          isCorrect: false,
        };

        let timeoutOpponentResult = opponentAnswerRef.current;
        if (!timeoutOpponentResult) {
          const oppPoints = calculatePoints(botSim.isCorrect, 0);
          timeoutOpponentResult = {
            selectedIndex: botSim.selectedIndex,
            timeRemainingMs: 0,
            pointsEarned: oppPoints,
            isCorrect: botSim.isCorrect,
          };
        }

        resolveRoundLocal(timeoutPlayerResult, timeoutOpponentResult);
      }
    }, TICK_INTERVAL_MS);

    return () => {
      clearInterval(tickInterval);
      resolveRoundRef.current = null;
    };
  }, [duelState, currentQuestionIndex, activeDriver]);

  // Action utilisateur : Répondre à la question courante
  const answerQuestion = useCallback(
    (selectedIndex: number) => {
      if (
        duelStateRef.current !== 'READING' ||
        playerAnswerRef.current !== null ||
        isResolvingRef.current ||
        !currentQuestionRef.current
      ) {
        return;
      }

      const now = Date.now();
      const elapsed = now - roundStartTimeRef.current;
      const remaining = Math.max(0, ROUND_TIME_MS - elapsed);
      const isCorrect = selectedIndex === currentQuestionRef.current.correctIndex;
      const pointsEarned = calculatePoints(isCorrect, remaining);

      const pResult: PlayerRoundResult = {
        selectedIndex,
        timeRemainingMs: remaining,
        pointsEarned,
        isCorrect,
      };

      playerAnswerRef.current = pResult;
      setPlayerRoundResult(pResult);

      // Émission réseau vers la Gateway NestJS
      if (activeDriver === 'websocket' && webSocketRef.current?.readyState === WebSocket.OPEN) {
        const answerMsg: DuelClientEvent = {
          type: 'DUEL_SUBMIT_ANSWER',
          payload: {
            duelId: currentDuelIdRef.current || duelId,
            roundIndex: currentQuestionIndexRef.current,
            questionId: currentQuestionRef.current.id,
            selectedIndex,
            timeRemainingMs: remaining,
          },
        };
        webSocketRef.current.send(JSON.stringify(answerMsg));
      }

      // Si mode local et adversaire a déjà répondu
      if (activeDriver === 'local_bot' && opponentAnswerRef.current !== null) {
        resolveRoundRef.current?.(pResult, opponentAnswerRef.current);
      }
    },
    [activeDriver, duelId]
  );

  // Annuler la recherche de match
  const cancelSearch = useCallback(() => {
    setIsSearchingMatch(false);
    setIsMatchProposed(false);
    setHasAcceptedMatch(false);
    setHasOpponentAccepted(false);
    setProposedOpponent(null);
    setSearchDurationSeconds(0);
    setQueuePosition(null);
    if (webSocketRef.current?.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify({ type: 'DUEL_QUEUE_LEAVE' }));
      webSocketRef.current.close();
    }
    setActiveDriver('local_bot');
  }, []);

  // Accepter le match proposé
  const acceptMatch = useCallback(() => {
    if (webSocketRef.current?.readyState === WebSocket.OPEN && currentDuelIdRef.current) {
      setHasAcceptedMatch(true);
      webSocketRef.current.send(
        JSON.stringify({
          type: 'DUEL_MATCH_ACCEPT',
          payload: { duelId: currentDuelIdRef.current },
        }),
      );
    }
  }, []);

  // Refuser le match proposé
  const declineMatch = useCallback(() => {
    if (webSocketRef.current?.readyState === WebSocket.OPEN && currentDuelIdRef.current) {
      webSocketRef.current.send(
        JSON.stringify({
          type: 'DUEL_MATCH_DECLINE',
          payload: { duelId: currentDuelIdRef.current },
        }),
      );
    }
    setIsMatchProposed(false);
    setHasAcceptedMatch(false);
    setHasOpponentAccepted(false);
    setProposedOpponent(null);
    setIsSearchingMatch(false);
    setActiveDriver('local_bot');
  }, []);

  // Lancer la recherche de match multijoueur
  const startMatchmaking = useCallback(() => {
    setErrorMessage(null);
    setIsMatchProposed(false);
    setHasAcceptedMatch(false);
    setHasOpponentAccepted(false);
    setProposedOpponent(null);
    setActiveDriver('websocket');
    setIsSearchingMatch(true);
    setSearchDurationSeconds(0);
  }, []);

  // Redémarrage complet du duel
  const restartDuel = useCallback(() => {
    setCurrentQuestionIndex(0);
    currentQuestionIndexRef.current = 0;
    setServerQuestion(null);
    setPlayerRoundResult(null);
    setOpponentRoundResult(null);
    setTimeRemainingMs(ROUND_TIME_MS);
    setErrorMessage(null);

    setPlayerStats({
      name: playerName,
      totalScore: 0,
      correctAnswers: 0,
      totalResponseTimeMs: 0,
      roundScores: [],
    });
    setOpponentStats({
      name: activeDriver === 'websocket' ? 'Adversaire' : opponentName,
      totalScore: 0,
      correctAnswers: 0,
      totalResponseTimeMs: 0,
      roundScores: [],
    });

    if (activeDriver === 'websocket') {
      setIsSearchingMatch(true);
      if (webSocketRef.current?.readyState === WebSocket.OPEN) {
        webSocketRef.current.send(
          JSON.stringify({
            type: 'DUEL_JOIN',
            payload: { duelId: 'matchmaking', playerName },
          })
        );
      }
    } else {
      setDuelState('READING');
      duelStateRef.current = 'READING';
    }
  }, [playerName, opponentName, activeDriver]);

  return {
    duelState,
    currentQuestionIndex,
    currentQuestion,
    totalQuestions: activeQuestions.length,
    timeRemainingMs,
    playerRoundResult,
    opponentRoundResult,
    playerStats,
    opponentStats,
    isPlayerAnswered: playerRoundResult !== null,
    isOpponentAnswered: opponentRoundResult !== null,
    answerQuestion,
    restartDuel,

    // Contrôles multijoueur (PHASE 2 & Ready Check)
    driver: activeDriver,
    setDriver: setActiveDriver,
    isSearchingMatch,
    searchDurationSeconds,
    queuePosition,
    connectionStatus,
    errorMessage,
    cancelSearch,
    startMatchmaking,

    // Ready Check
    isMatchProposed,
    hasAcceptedMatch,
    hasOpponentAccepted,
    matchAcceptTimeRemainingMs,
    proposedOpponent,
    acceptMatch,
    declineMatch,
  };
}
