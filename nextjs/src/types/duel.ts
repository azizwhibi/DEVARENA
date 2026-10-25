export interface Question {
  id: string;
  prompt: string;
  snippet?: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export type DuelState = 'PROPOSED' | 'READING' | 'RESOLUTION' | 'FINISHED';

export interface PlayerRoundResult {
  selectedIndex: number | null;
  timeRemainingMs: number;
  pointsEarned: number;
  isCorrect: boolean;
}

export interface PlayerStats {
  name: string;
  totalScore: number;
  correctAnswers: number;
  totalResponseTimeMs: number;
  roundScores: number[];
}

/**
 * ============================================================================
 * CONTRATS D'ÉVÉNEMENTS WEBSOCKET (NestJS Gateway :3000 <-> Next.js Client :3001)
 * ============================================================================
 */

export type DuelClientEventType =
  | 'DUEL_JOIN'
  | 'DUEL_SUBMIT_ANSWER'
  | 'DUEL_QUEUE_JOIN'
  | 'DUEL_QUEUE_LEAVE'
  | 'DUEL_MATCH_ACCEPT'
  | 'DUEL_MATCH_DECLINE';

export interface DuelJoinPayload {
  duelId?: string;
  playerId?: string;
  playerName?: string;
}

export interface DuelSubmitAnswerPayload {
  duelId: string;
  roundIndex: number;
  questionId: string;
  selectedIndex: number;
  timeRemainingMs: number;
}

export interface DuelQueueJoinPayload {
  playerId?: string;
  playerName?: string;
}

export interface DuelQueueLeavePayload {
  playerId?: string;
}

export interface DuelMatchAcceptPayload {
  duelId: string;
}

export interface DuelMatchDeclinePayload {
  duelId: string;
}

export type DuelClientEvent =
  | { type: 'DUEL_JOIN'; payload: DuelJoinPayload }
  | { type: 'DUEL_SUBMIT_ANSWER'; payload: DuelSubmitAnswerPayload }
  | { type: 'DUEL_QUEUE_JOIN'; payload?: DuelQueueJoinPayload }
  | { type: 'DUEL_QUEUE_LEAVE'; payload?: DuelQueueLeavePayload }
  | { type: 'DUEL_MATCH_ACCEPT'; payload: DuelMatchAcceptPayload }
  | { type: 'DUEL_MATCH_DECLINE'; payload: DuelMatchDeclinePayload };

export type DuelServerEventType =
  | 'DUEL_ROUND_START'
  | 'DUEL_OPPONENT_ANSWERED'
  | 'DUEL_ROUND_RESOLVE'
  | 'DUEL_MATCH_END'
  | 'DUEL_MATCH_FOUND'
  | 'DUEL_QUEUE_WAITING'
  | 'DUEL_ERROR'
  | 'DUEL_MATCH_PROPOSED'
  | 'DUEL_MATCH_ACCEPTED_UPDATE'
  | 'DUEL_MATCH_CANCELLED';

export interface DuelRoundStartPayload {
  duelId: string;
  roundIndex: number;
  question: Question;
  roundDurationMs: number;
  serverTimestamp: number;
}

export interface DuelOpponentAnsweredPayload {
  duelId: string;
  roundIndex: number;
  opponentId: string;
  timeRemainingMs: number;
  selectedIndex?: number; // Révélé optionnellement lors de la résolution
}

export interface DuelRoundResolvePayload {
  duelId: string;
  roundIndex: number;
  correctIndex: 0 | 1 | 2 | 3;
  playerResult: PlayerRoundResult;
  opponentResult: PlayerRoundResult;
  playerTotalScore: number;
  opponentTotalScore: number;
}

export interface DuelMatchEndPayload {
  duelId: string;
  winnerId: string | null; // null si égalité
  finalStats: {
    player: PlayerStats;
    opponent: PlayerStats;
  };
}

export interface DuelMatchFoundPayload {
  duelId: string;
  player: {
    id: string;
    name: string;
  };
  opponent: {
    id: string;
    name: string;
  };
}

export interface DuelQueueWaitingPayload {
  playerId: string;
  position: number;
}

export interface DuelErrorPayload {
  code: string;
  message: string;
}

export interface DuelMatchProposedPayload {
  duelId: string;
  opponent: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  timeoutMs: number;
}

export interface DuelMatchAcceptedUpdatePayload {
  duelId: string;
  acceptedPlayerIds: string[];
}

export interface DuelMatchCancelledPayload {
  duelId?: string;
  reason: 'declined' | 'timeout';
  byPlayerId?: string;
}

export type DuelServerEvent =
  | { type: 'DUEL_ROUND_START'; payload: DuelRoundStartPayload }
  | { type: 'DUEL_OPPONENT_ANSWERED'; payload: DuelOpponentAnsweredPayload }
  | { type: 'DUEL_ROUND_RESOLVE'; payload: DuelRoundResolvePayload }
  | { type: 'DUEL_MATCH_END'; payload: DuelMatchEndPayload }
  | { type: 'DUEL_MATCH_FOUND'; payload: DuelMatchFoundPayload }
  | { type: 'DUEL_QUEUE_WAITING'; payload: DuelQueueWaitingPayload }
  | { type: 'DUEL_ERROR'; payload: DuelErrorPayload }
  | { type: 'DUEL_MATCH_PROPOSED'; payload: DuelMatchProposedPayload }
  | { type: 'DUEL_MATCH_ACCEPTED_UPDATE'; payload: DuelMatchAcceptedUpdatePayload }
  | { type: 'DUEL_MATCH_CANCELLED'; payload: DuelMatchCancelledPayload };

/**
 * Interface d'abstraction du pilote (Driver Pattern)
 */
export type DuelDriverType = 'local_bot' | 'websocket';

export interface DuelNetworkDriver {
  connect: () => void;
  disconnect: () => void;
  sendAnswer: (payload: DuelSubmitAnswerPayload) => void;
  onEvent: (handler: (event: DuelServerEvent) => void) => () => void;
}

export interface UseQuizDuelOptions {
  questions?: Question[];
  playerName?: string;
  opponentName?: string;
  autoStart?: boolean;
  driver?: DuelDriverType;
  socketUrl?: string;
  duelId?: string;
  onRoundComplete?: (round: {
    questionIndex: number;
    playerResult: PlayerRoundResult;
    opponentResult: PlayerRoundResult;
  }) => void;
  onFinish?: (finalStats: {
    player: PlayerStats;
    opponent: PlayerStats;
  }) => void;
}

export interface UseQuizDuelReturn {
  duelState: DuelState;
  currentQuestionIndex: number;
  currentQuestion: Question | null;
  totalQuestions: number;
  timeRemainingMs: number;
  playerRoundResult: PlayerRoundResult | null;
  opponentRoundResult: PlayerRoundResult | null;
  playerStats: PlayerStats;
  opponentStats: PlayerStats;
  isPlayerAnswered: boolean;
  isOpponentAnswered: boolean;
  answerQuestion: (selectedIndex: number) => void;
  restartDuel: (driverOverride?: DuelDriverType) => void;
  forfeitDuel: (reason?: string) => void;
  forfeitOutcome: 'self' | 'opponent' | null;

  // Détection Réseau (PHASE A)
  isOnline: boolean;

  // Contrôles multijoueur & Matchmaking WebSocket (PHASE 2 & Ready Check)
  driver: DuelDriverType;
  setDriver: (driver: DuelDriverType) => void;
  isSearchingMatch: boolean;
  searchDurationSeconds: number;
  queuePosition: number | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  errorMessage: string | null;
  cancelSearch: () => void;
  startMatchmaking: () => void;

  // Ready Check
  isMatchProposed: boolean;
  hasAcceptedMatch: boolean;
  hasOpponentAccepted: boolean;
  matchAcceptTimeRemainingMs: number;
  proposedOpponent: { id: string; name: string; avatarUrl?: string } | null;
  acceptMatch: () => void;
  declineMatch: () => void;
}
