import type { WebSocket } from 'ws';

export interface Question {
  id: string;
  prompt: string;
  snippet?: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export type DuelState =
  | 'PROPOSED'
  | 'READING'
  | 'RESOLUTION'
  | 'FINISHED'
  | 'WAITING';

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
 * CONTRATS D'ÉVÉNEMENTS CLIENT -> SERVEUR
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

/**
 * ============================================================================
 * CONTRATS D'ÉVÉNEMENTS SERVEUR -> CLIENT
 * ============================================================================
 */
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
  selectedIndex?: number;
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
  winnerId: string | null;
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

export interface ProposedMatch {
  duelId: string;
  player1: WaitingPlayer;
  player2: WaitingPlayer;
  acceptedPlayerIds: Set<string>;
  timeoutTimer: NodeJS.Timeout;
  createdAt: number;
}

/**
 * ============================================================================
 * STRUCTURES INTERNES SERVEUR & SESSION DE MATCH
 * ============================================================================
 */
export interface AuthenticatedPlayer {
  id: string;
  name: string;
  email?: string;
  isGuest: boolean;
  socket: WebSocket;
}

export interface WaitingPlayer {
  playerId: string;
  playerName: string;
  socket: WebSocket;
  joinedAt: Date;
}

export interface RoomPlayerState {
  id: string;
  name: string;
  socket: WebSocket;
  totalScore: number;
  correctAnswers: number;
  totalResponseTimeMs: number;
  roundScores: number[];
  currentRoundAnswer: {
    selectedIndex: number | null;
    timeRemainingMs: number;
    submittedAt: number;
  } | null;
}

export interface DuelRoomSession {
  duelId: string;
  player1: RoomPlayerState;
  player2: RoomPlayerState;
  questions: Question[];
  currentRoundIndex: number;
  state: DuelState;
  roundDurationMs: number;
  roundStartTime: number;
  roundTimeoutTimer?: NodeJS.Timeout;
  resolutionTimer?: NodeJS.Timeout;
  createdAt: Date;
}
