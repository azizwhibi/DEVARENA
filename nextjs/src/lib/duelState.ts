import type {
  DuelServerEvent,
  PlayerStats,
  PlayerRoundResult,
  Question,
  DuelRatingUpdatePayload,
} from '@/types/duel';

export const ROUND_TIME_MS = 10_000;
export const calculatePoints = (correct: boolean, remaining: number) =>
  correct
    ? 500 +
      Math.round(
        (Math.max(0, Math.min(ROUND_TIME_MS, remaining)) / ROUND_TIME_MS) * 500,
      )
    : 0;
export const emptyStats = (name: string): PlayerStats => ({
  name,
  totalScore: 0,
  correctAnswers: 0,
  totalResponseTimeMs: 0,
  roundScores: [],
});
export type BattleState = {
  mode: 'online' | 'solo';
  phase:
    | 'idle'
    | 'connecting'
    | 'searching'
    | 'proposed'
    | 'reading'
    | 'resolution'
    | 'finished';
  duelId: string;
  question: Omit<Question, 'correctIndex'> | null;
  round: number;
  total: number;
  remaining: number;
  deadline: number;
  accepted: boolean;
  opponentAccepted: boolean;
  player: PlayerStats;
  opponent: PlayerStats;
  answer: number | null;
  opponentAnswered: boolean;
  correctIndex: number | null;
  error: string;
  winnerId: string | null;
  ratingUpdate: DuelRatingUpdatePayload | null;
  ratingStatus: 'idle' | 'pending' | 'saved' | 'failed';
  rounds: { player: PlayerRoundResult; opponent: PlayerRoundResult }[];
};
export const initialBattle = (name: string): BattleState => ({
  mode: 'online',
  phase: 'idle',
  duelId: '',
  question: null,
  round: 0,
  total: 10,
  remaining: ROUND_TIME_MS,
  deadline: 0,
  accepted: false,
  opponentAccepted: false,
  player: emptyStats(name),
  opponent: emptyStats('Opponent'),
  answer: null,
  opponentAnswered: false,
  correctIndex: null,
  error: '',
  winnerId: null,
  ratingUpdate: null,
  ratingStatus: 'idle',
  rounds: [],
});
export function addResult(
  stats: PlayerStats,
  result: PlayerRoundResult,
): PlayerStats {
  return {
    ...stats,
    totalScore: stats.totalScore + result.pointsEarned,
    correctAnswers: stats.correctAnswers + Number(result.isCorrect),
    totalResponseTimeMs:
      stats.totalResponseTimeMs + ROUND_TIME_MS - result.timeRemainingMs,
    roundScores: [...stats.roundScores, result.pointsEarned],
  };
}
export function receiveBattle(
  state: BattleState,
  event: DuelServerEvent,
  playerId: string,
  now: number,
): BattleState {
  switch (event.type) {
    case 'DUEL_RATING_UPDATED':
      if (state.mode !== 'online' || state.duelId !== event.payload.duelId ||
          ![event.payload.delta, event.payload.rating, event.payload.competitivePoints].every(Number.isSafeInteger) ||
          event.payload.rating < 800 || event.payload.competitivePoints < 0 ||
          (event.payload.marginBonus !== undefined && !Number.isSafeInteger(event.payload.marginBonus)))
        return state;
      return { ...state, ratingUpdate: event.payload, ratingStatus: 'saved' };
    case 'DUEL_RATING_STATUS':
      if (state.mode !== 'online' || state.duelId !== event.payload.duelId || state.ratingUpdate ||
          !['pending', 'failed'].includes(event.payload.status))
        return state;
      return { ...state, ratingStatus: event.payload.status };
    case 'DUEL_QUEUE_WAITING':
      return {
        ...state,
        phase: 'searching',
        accepted: false,
        opponentAccepted: false,
      };
    case 'DUEL_MATCH_FOUND':
      return {
        ...initialBattle(state.player.name),
        mode: 'online',
        phase: 'searching',
        duelId: event.payload.duelId,
        opponent: emptyStats(event.payload.opponent.name),
      };
    case 'DUEL_MATCH_PROPOSED':
      return {
        ...state,
        phase: 'proposed',
        duelId: event.payload.duelId,
        opponent: emptyStats(event.payload.opponent.name),
        remaining: event.payload.timeoutMs,
        deadline: now + event.payload.timeoutMs,
        accepted: false,
        opponentAccepted: false,
        error: '',
      };
    case 'DUEL_MATCH_ACCEPTED_UPDATE':
      return {
        ...state,
        accepted: event.payload.acceptedPlayerIds.includes(playerId),
        opponentAccepted: event.payload.acceptedPlayerIds.some(
          (id) => id !== playerId,
        ),
      };
    case 'DUEL_MATCH_CANCELLED':
      return {
        ...state,
        phase: 'idle',
        accepted: false,
        opponentAccepted: false,
        error:
          event.payload.reason === 'timeout'
            ? 'Ready check expired. Find another opponent.'
            : 'Match declined.',
      };
    case 'DUEL_ROUND_START':
      return {
        ...state,
        phase: 'reading',
        duelId: event.payload.duelId,
        question: event.payload.question,
        total: event.payload.totalQuestions,
        round: event.payload.roundIndex,
        remaining: event.payload.roundDurationMs,
        deadline: now + event.payload.roundDurationMs,
        answer: null,
        opponentAnswered: false,
        correctIndex: null,
        error: '',
      };
    case 'DUEL_OPPONENT_ANSWERED':
      return { ...state, opponentAnswered: true };
    case 'DUEL_ROUND_RESOLVE': {
      if (
        state.duelId !== event.payload.duelId ||
        state.round !== event.payload.roundIndex ||
        state.phase === 'resolution'
      )
        return state;
      return {
        ...state,
        phase: 'resolution',
        correctIndex: event.payload.correctIndex,
        answer: event.payload.playerResult.selectedIndex,
        player: {
          ...addResult(state.player, event.payload.playerResult),
          totalScore: event.payload.playerTotalScore,
        },
        opponent: {
          ...addResult(state.opponent, event.payload.opponentResult),
          totalScore: event.payload.opponentTotalScore,
        },
        rounds: [
          ...state.rounds,
          {
            player: event.payload.playerResult,
            opponent: event.payload.opponentResult,
          },
        ],
      };
    }
    case 'DUEL_MATCH_END':
      if (state.mode !== 'online' || state.duelId !== event.payload.duelId) return state;
      return {
        ...state,
        phase: 'finished',
        player: event.payload.finalStats.player,
        opponent: event.payload.finalStats.opponent,
        winnerId: event.payload.winnerId,
        ratingStatus: state.ratingUpdate ? 'saved' : state.ratingStatus === 'failed' ? 'failed' : 'pending',
      };
    case 'DUEL_ERROR':
      return { ...state, error: event.payload.message };
    default:
      return state;
  }
}
