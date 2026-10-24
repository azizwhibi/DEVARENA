import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { WebSocket } from 'ws';
import {
  DEFAULT_DUEL_QUESTIONS,
  MAX_ROUNDS,
  RESOLUTION_DURATION_MS,
  ROUND_DURATION_MS,
  calculatePoints,
  safeSend,
} from './duel.constants';
import type {
  DuelMatchEndPayload,
  DuelOpponentAnsweredPayload,
  DuelRoundResolvePayload,
  DuelRoundStartPayload,
  DuelRoomSession,
  PlayerRoundResult,
  PlayerStats,
  Question,
  RoomPlayerState,
  WaitingPlayer,
} from './duel.types';

import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DuelRoomService {
  private readonly logger = new Logger(DuelRoomService.name);
  private readonly cleanupTimers = new Set<ReturnType<typeof setTimeout>>();
  private readonly rooms = new Map<string, DuelRoomSession>();
  private readonly playerToRoom = new Map<string, string>();
  private readonly socketToRoom = new Map<WebSocket, string>();

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Instancie une salle de duel unique avec l'état d'arbitrage initial et les 10 questions.
   */
  createRoom(
    duelId: string,
    player1: WaitingPlayer,
    player2: WaitingPlayer,
    customQuestions?: Question[],
  ): DuelRoomSession {
    if (
      player1.playerId === player2.playerId ||
      [player1, player2].some((p) => {
        const old = this.getRoomByPlayerId(p.playerId);
        return old && old.state !== 'FINISHED';
      })
    )
      throw new BadRequestException('Player is already in a battle.');
    const questions = customQuestions?.length
      ? customQuestions.slice(0, MAX_ROUNDS)
      : [...DEFAULT_DUEL_QUESTIONS];

    const p1State: RoomPlayerState = {
      id: player1.playerId,
      name: player1.playerName,
      socket: player1.socket,
      totalScore: 0,
      correctAnswers: 0,
      totalResponseTimeMs: 0,
      roundScores: [],
      currentRoundAnswer: null,
    };

    const p2State: RoomPlayerState = {
      id: player2.playerId,
      name: player2.playerName,
      socket: player2.socket,
      totalScore: 0,
      correctAnswers: 0,
      totalResponseTimeMs: 0,
      roundScores: [],
      currentRoundAnswer: null,
    };

    const room: DuelRoomSession = {
      duelId,
      player1: p1State,
      player2: p2State,
      questions,
      currentRoundIndex: 0,
      state: 'READING',
      roundDurationMs: ROUND_DURATION_MS,
      roundStartTime: Date.now(),
      createdAt: new Date(),
    };

    this.rooms.set(duelId, room);
    this.playerToRoom.set(player1.playerId, duelId);
    this.playerToRoom.set(player2.playerId, duelId);
    this.socketToRoom.set(player1.socket, duelId);
    this.socketToRoom.set(player2.socket, duelId);

    this.logger.log(
      `Room ${duelId} created: ${player1.playerName} vs ${player2.playerName} (10 questions initialized)`,
    );

    return room;
  }

  getRoom(duelId: string): DuelRoomSession | undefined {
    return this.rooms.get(duelId);
  }

  getRoomByPlayerId(playerId: string): DuelRoomSession | undefined {
    const duelId = this.playerToRoom.get(playerId);
    return duelId ? this.rooms.get(duelId) : undefined;
  }

  getRoomBySocket(socket: WebSocket): DuelRoomSession | undefined {
    const duelId = this.socketToRoom.get(socket);
    return duelId ? this.rooms.get(duelId) : undefined;
  }

  /**
   * Démarre un round spécifique synchronisé sur les 2 sockets.
   */
  startRound(duelId: string, roundIndex: number): void {
    const room = this.rooms.get(duelId);
    if (!room || room.state === 'FINISHED') return;

    if (roundIndex >= room.questions.length) {
      this.endMatch(duelId);
      return;
    }

    if (room.roundTimeoutTimer) {
      clearTimeout(room.roundTimeoutTimer);
      room.roundTimeoutTimer = undefined;
    }

    room.currentRoundIndex = roundIndex;
    room.state = 'READING';
    room.roundStartTime = Date.now();
    room.player1.currentRoundAnswer = null;
    room.player2.currentRoundAnswer = null;

    const question = room.questions[roundIndex];
    const serverTimestamp = Date.now();

    const startPayload: DuelRoundStartPayload = {
      duelId,
      roundIndex,
      question: {
        id: question.id,
        prompt: question.prompt,
        snippet: question.snippet,
        options: question.options,
      },
      totalQuestions: room.questions.length,
      roundDurationMs: room.roundDurationMs,
      serverTimestamp,
    };

    safeSend(room.player1.socket, {
      type: 'DUEL_ROUND_START',
      payload: startPayload,
    });
    safeSend(room.player2.socket, {
      type: 'DUEL_ROUND_START',
      payload: startPayload,
    });

    this.logger.log(
      `Room ${duelId}: Round ${roundIndex + 1}/${room.questions.length} started`,
    );

    // Timeout serveur si les joueurs ne répondent pas dans le délai imparti
    room.roundTimeoutTimer = setTimeout(() => {
      this.logger.log(
        `Room ${duelId}: Round ${roundIndex + 1} timed out on server`,
      );
      this.resolveRound(room);
    }, room.roundDurationMs);
  }

  /**
   * Enregistre la réponse d'un joueur et gère la notification adverse sans triche.
   */
  submitAnswer(
    duelId: string,
    playerId: string,
    roundIndex: number,
    selectedIndex: number,
    _timeRemainingMs: number,
    clientSocket?: WebSocket,
    receivedAt = Date.now(),
  ): void {
    const room = this.rooms.get(duelId);
    if (!room || room.state !== 'READING') return;
    if (roundIndex !== room.currentRoundIndex) return;

    if (
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex > 3 ||
      receivedAt >= room.roundStartTime + room.roundDurationMs
    )
      return;
    const isPlayer1 =
      room.player1.id === playerId &&
      (!clientSocket || room.player1.socket === clientSocket);
    const isPlayer2 =
      room.player2.id === playerId &&
      (!clientSocket || room.player2.socket === clientSocket);
    if (!isPlayer1 && !isPlayer2) return;

    const playerState = isPlayer1 ? room.player1 : room.player2;
    const opponentState = isPlayer1 ? room.player2 : room.player1;

    // Évite les réponses multiples sur le même round
    if (playerState.currentRoundAnswer !== null) return;

    playerState.currentRoundAnswer = {
      selectedIndex,
      timeRemainingMs: Math.max(
        0,
        Math.min(
          room.roundDurationMs,
          room.roundDurationMs - (receivedAt - room.roundStartTime),
        ),
      ),
      submittedAt: Date.now(),
    };

    // Notification adverse : selectedIndex masqué pour empêcher la triche (Section 4.2 SPEC)
    const opponentNotification: DuelOpponentAnsweredPayload = {
      duelId,
      roundIndex,
      opponentId: playerState.id,
      timeRemainingMs: playerState.currentRoundAnswer.timeRemainingMs,
    };

    safeSend(opponentState.socket, {
      type: 'DUEL_OPPONENT_ANSWERED',
      payload: opponentNotification,
    });

    // Si les deux joueurs ont répondu, résolution immédiate
    if (
      room.player1.currentRoundAnswer !== null &&
      room.player2.currentRoundAnswer !== null
    ) {
      if (room.roundTimeoutTimer) {
        clearTimeout(room.roundTimeoutTimer);
        room.roundTimeoutTimer = undefined;
      }
      this.resolveRound(room);
    }
  }

  /**
   * Phase RESOLUTION : calcul des scores et synchronisation des résultats.
   */
  private resolveRound(room: DuelRoomSession): void {
    if (room.state === 'RESOLUTION' || room.state === 'FINISHED') return;
    room.state = 'RESOLUTION';

    if (room.roundTimeoutTimer) {
      clearTimeout(room.roundTimeoutTimer);
      room.roundTimeoutTimer = undefined;
    }

    const question = room.questions[room.currentRoundIndex];
    const correctIndex = question.correctIndex;

    // Traitement joueur 1 (timeout si pas de réponse)
    const p1Ans = room.player1.currentRoundAnswer ?? {
      selectedIndex: null,
      timeRemainingMs: 0,
      submittedAt: Date.now(),
    };
    const p1Correct = p1Ans.selectedIndex === correctIndex;
    const p1Points = calculatePoints(p1Correct, p1Ans.timeRemainingMs);
    const p1ResponseTime = ROUND_DURATION_MS - p1Ans.timeRemainingMs;

    room.player1.totalScore += p1Points;
    room.player1.roundScores.push(p1Points);
    room.player1.totalResponseTimeMs += p1ResponseTime;
    if (p1Correct) room.player1.correctAnswers += 1;

    // Traitement joueur 2 (timeout si pas de réponse)
    const p2Ans = room.player2.currentRoundAnswer ?? {
      selectedIndex: null,
      timeRemainingMs: 0,
      submittedAt: Date.now(),
    };
    const p2Correct = p2Ans.selectedIndex === correctIndex;
    const p2Points = calculatePoints(p2Correct, p2Ans.timeRemainingMs);
    const p2ResponseTime = ROUND_DURATION_MS - p2Ans.timeRemainingMs;

    room.player2.totalScore += p2Points;
    room.player2.roundScores.push(p2Points);
    room.player2.totalResponseTimeMs += p2ResponseTime;
    if (p2Correct) room.player2.correctAnswers += 1;

    const p1Result: PlayerRoundResult = {
      selectedIndex: p1Ans.selectedIndex,
      timeRemainingMs: p1Ans.timeRemainingMs,
      pointsEarned: p1Points,
      isCorrect: p1Correct,
    };

    const p2Result: PlayerRoundResult = {
      selectedIndex: p2Ans.selectedIndex,
      timeRemainingMs: p2Ans.timeRemainingMs,
      pointsEarned: p2Points,
      isCorrect: p2Correct,
    };

    // Diffusion personnalisée de DUEL_ROUND_RESOLVE pour chaque socket
    const p1Payload: DuelRoundResolvePayload = {
      duelId: room.duelId,
      roundIndex: room.currentRoundIndex,
      correctIndex,
      playerResult: p1Result,
      opponentResult: p2Result,
      playerTotalScore: room.player1.totalScore,
      opponentTotalScore: room.player2.totalScore,
    };

    const p2Payload: DuelRoundResolvePayload = {
      duelId: room.duelId,
      roundIndex: room.currentRoundIndex,
      correctIndex,
      playerResult: p2Result,
      opponentResult: p1Result,
      playerTotalScore: room.player2.totalScore,
      opponentTotalScore: room.player1.totalScore,
    };

    safeSend(room.player1.socket, {
      type: 'DUEL_ROUND_RESOLVE',
      payload: p1Payload,
    });
    safeSend(room.player2.socket, {
      type: 'DUEL_ROUND_RESOLVE',
      payload: p2Payload,
    });

    this.logger.log(
      `Room ${room.duelId} Round ${room.currentRoundIndex + 1} resolved: ${room.player1.name}(${room.player1.totalScore}) vs ${room.player2.name}(${room.player2.totalScore})`,
    );

    // Gel strict de 2000ms avant round suivant ou fin du match
    room.resolutionTimer = setTimeout(() => {
      const nextRound = room.currentRoundIndex + 1;
      if (nextRound < room.questions.length) {
        this.startRound(room.duelId, nextRound);
      } else {
        this.endMatch(room.duelId);
      }
    }, RESOLUTION_DURATION_MS);
  }

  /**
   * Clôture du match et envoi du rapport final.
   */
  endMatch(duelId: string, forfeitWinnerId?: string): void {
    const room = this.rooms.get(duelId);
    if (!room || room.state === 'FINISHED') return;
    room.state = 'FINISHED';

    if (room.roundTimeoutTimer) clearTimeout(room.roundTimeoutTimer);
    if (room.resolutionTimer) clearTimeout(room.resolutionTimer);

    let winnerId: string | null = null;
    if (room.player1.totalScore > room.player2.totalScore) {
      winnerId = room.player1.id;
    } else if (room.player2.totalScore > room.player1.totalScore) {
      winnerId = room.player2.id;
    }

    if (
      forfeitWinnerId &&
      [room.player1.id, room.player2.id].includes(forfeitWinnerId)
    )
      winnerId = forfeitWinnerId;

    const p1Stats: PlayerStats = {
      name: room.player1.name,
      totalScore: room.player1.totalScore,
      correctAnswers: room.player1.correctAnswers,
      totalResponseTimeMs: room.player1.totalResponseTimeMs,
      roundScores: room.player1.roundScores,
    };

    const p2Stats: PlayerStats = {
      name: room.player2.name,
      totalScore: room.player2.totalScore,
      correctAnswers: room.player2.correctAnswers,
      totalResponseTimeMs: room.player2.totalResponseTimeMs,
      roundScores: room.player2.roundScores,
    };

    const endForP1: DuelMatchEndPayload = {
      duelId,
      winnerId,
      finalStats: { player: p1Stats, opponent: p2Stats },
    };

    const endForP2: DuelMatchEndPayload = {
      duelId,
      winnerId,
      finalStats: { player: p2Stats, opponent: p1Stats },
    };

    safeSend(room.player1.socket, {
      type: 'DUEL_MATCH_END',
      payload: endForP1,
    });
    safeSend(room.player2.socket, {
      type: 'DUEL_MATCH_END',
      payload: endForP2,
    });

    this.logger.log(`Room ${duelId} finished. Winner: ${winnerId ?? 'DRAW'}`);

    // Persistance asynchrone non-bloquante du match & attribution d'XP
    void this.persistMatchResult(room, winnerId);

    // Nettoyage après 60s
    const cleanup = setTimeout(() => {
      this.cleanupTimers.delete(cleanup);
      this.removeRoom(duelId);
    }, 60_000);
    this.cleanupTimers.add(cleanup);
  }

  /**
   * Persiste la ligne du match dans public.duel_matches et crédite l'XP des profils authentifiés.
   * Gestion d'erreur non bloquante pour préserver la stabilité de la passerelle.
   */
  private async persistMatchResult(
    room: DuelRoomSession,
    winnerId: string | null,
  ): Promise<void> {
    try {
      const roundsSummary = room.player1.roundScores.map((score, idx) => ({
        roundIndex: idx,
        questionId: room.questions[idx].id,
        player1Score: score,
        player2Score: room.player2.roundScores[idx] ?? 0,
      }));
      const { error } = await this.supabase.client.from('duel_matches').insert({
        id: room.duelId,
        player1_id: room.player1.id,
        player2_id: room.player2.id,
        player1_score: room.player1.totalScore,
        player2_score: room.player2.totalScore,
        winner_id: winnerId,
        rounds_data: roundsSummary,
      });
      if (error)
        this.logger.warn(
          'Battle result could not be saved. Check the duel integration migration.',
        );
    } catch {
      this.logger.warn('Battle result could not be saved.');
    }
  }

  onModuleDestroy() {
    for (const timer of this.cleanupTimers) clearTimeout(timer);
    for (const id of this.rooms.keys()) this.removeRoom(id);
  }

  reconnectPlayer(
    duelId: string,
    playerId: string,
    newSocket: WebSocket,
  ): boolean {
    const room = this.rooms.get(duelId);
    if (!room) return false;

    if (room.player1.id === playerId) {
      this.socketToRoom.delete(room.player1.socket);
      room.player1.socket = newSocket;
      this.socketToRoom.set(newSocket, duelId);
      return true;
    }
    if (room.player2.id === playerId) {
      this.socketToRoom.delete(room.player2.socket);
      room.player2.socket = newSocket;
      this.socketToRoom.set(newSocket, duelId);
      return true;
    }
    return false;
  }

  handlePlayerDisconnect(socket: WebSocket): void {
    const duelId = this.socketToRoom.get(socket);
    if (!duelId) return;

    const room = this.rooms.get(duelId);
    if (!room) {
      this.socketToRoom.delete(socket);
      return;
    }

    this.logger.warn(`Player disconnected from room ${duelId}`);
    // Si la room est active, on peut clore le match prématurément par forfait
    if (room.state !== 'FINISHED') {
      const isP1 = room.player1.socket === socket;
      const winnerId = isP1 ? room.player2.id : room.player1.id;
      const remainingSocket = isP1 ? room.player2.socket : room.player1.socket;

      safeSend(remainingSocket, {
        type: 'DUEL_ERROR',
        payload: {
          code: 'OPPONENT_DISCONNECTED',
          message: 'Your opponent disconnected. You win by forfeit.',
        },
      });

      this.endMatch(duelId, winnerId);
    }

    this.socketToRoom.delete(socket);
  }

  removeRoom(duelId: string): void {
    const room = this.rooms.get(duelId);
    if (!room) return;

    if (room.roundTimeoutTimer) clearTimeout(room.roundTimeoutTimer);
    if (room.resolutionTimer) clearTimeout(room.resolutionTimer);

    if (this.playerToRoom.get(room.player1.id) === duelId)
      this.playerToRoom.delete(room.player1.id);
    if (this.playerToRoom.get(room.player2.id) === duelId)
      this.playerToRoom.delete(room.player2.id);
    if (this.socketToRoom.get(room.player1.socket) === duelId)
      this.socketToRoom.delete(room.player1.socket);
    if (this.socketToRoom.get(room.player2.socket) === duelId)
      this.socketToRoom.delete(room.player2.socket);
    this.rooms.delete(duelId);

    this.logger.log(`Room ${duelId} purged from memory`);
  }
}
