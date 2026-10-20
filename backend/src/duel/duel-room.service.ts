import { Injectable, Logger } from '@nestjs/common';
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

import { isUUID } from 'class-validator';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DuelRoomService {
  private readonly logger = new Logger(DuelRoomService.name);
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
      question,
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
    timeRemainingMs: number,
    clientSocket?: WebSocket,
  ): void {
    const room = this.rooms.get(duelId);
    if (!room || room.state !== 'READING') return;
    if (roundIndex !== room.currentRoundIndex) return;

    const isPlayer1 =
      room.player1.id === playerId ||
      (clientSocket !== undefined && room.player1.socket === clientSocket);
    const isPlayer2 =
      room.player2.id === playerId ||
      (clientSocket !== undefined && room.player2.socket === clientSocket);
    if (!isPlayer1 && !isPlayer2) return;

    const playerState = isPlayer1 ? room.player1 : room.player2;
    const opponentState = isPlayer1 ? room.player2 : room.player1;

    // Évite les réponses multiples sur le même round
    if (playerState.currentRoundAnswer !== null) return;

    playerState.currentRoundAnswer = {
      selectedIndex,
      timeRemainingMs: Math.max(0, Math.min(ROUND_DURATION_MS, timeRemainingMs)),
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
  endMatch(duelId: string): void {
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
    setTimeout(() => {
      this.removeRoom(duelId);
    }, 60_000);
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
      const isP1Uuid = isUUID(room.player1.id);
      const isP2Uuid = isUUID(room.player2.id);
      const isWinnerUuid = winnerId ? isUUID(winnerId) : false;

      // Résumé structuré des 10 manches pour relecture/audit
      const roundsSummary = room.questions.map((q, idx) => ({
        roundIndex: idx,
        questionId: q.id,
        prompt: q.prompt,
        correctIndex: q.correctIndex,
        player1Score: room.player1.roundScores[idx] ?? 0,
        player2Score: room.player2.roundScores[idx] ?? 0,
      }));

      const matchRecord = {
        id: room.duelId,
        player1_id: isP1Uuid ? room.player1.id : null,
        player2_id: isP2Uuid ? room.player2.id : null,
        player1_score: room.player1.totalScore,
        player2_score: room.player2.totalScore,
        winner_id: isWinnerUuid ? winnerId : null,
        rounds_data: roundsSummary,
      };

      const { error: insertError } = await this.supabase.client
        .from('duel_matches' as any)
        .insert(matchRecord as any);

      if (insertError) {
        this.logger.warn(
          `Failed to persist duel match ${room.duelId} in duel_matches: ${insertError.message}`,
        );
      } else {
        this.logger.log(
          `Duel match ${room.duelId} recorded successfully in public.duel_matches`,
        );
      }

      // Attribution d'XP aux joueurs authentifiés
      // Victoire: +250 XP | Égalité: +100 XP | Défaite / Participation: +50 XP
      const isDraw = room.player1.totalScore === room.player2.totalScore;

      if (isP1Uuid) {
        const p1Xp = isDraw ? 100 : winnerId === room.player1.id ? 250 : 50;
        await this.awardXp(room.player1.id, p1Xp);
      }

      if (isP2Uuid) {
        const p2Xp = isDraw ? 100 : winnerId === room.player2.id ? 250 : 50;
        await this.awardXp(room.player2.id, p2Xp);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Non-blocking error during duel match persistence: ${msg}`,
      );
    }
  }

  /**
   * Incrémente l'XP d'un profil authentifié dans public.profiles.
   */
  private async awardXp(profileId: string, xpGained: number): Promise<void> {
    try {
      const { data: profile, error: readError } = await this.supabase.client
        .from('profiles')
        .select('id, xp' as any)
        .eq('id', profileId)
        .maybeSingle<any>();

      if (readError || !profile) {
        this.logger.warn(
          `Could not read profile ${profileId} for XP crediting: ${readError?.message ?? 'Not found'}`,
        );
        return;
      }

      const currentXp = typeof profile.xp === 'number' ? profile.xp : 0;
      const newXp = currentXp + xpGained;

      const { error: updateError } = await this.supabase.client
        .from('profiles')
        .update({ xp: newXp } as any)
        .eq('id', profileId);

      if (updateError) {
        this.logger.warn(
          `Failed to update XP for profile ${profileId}: ${updateError.message}`,
        );
      } else {
        this.logger.log(
          `Awarded +${xpGained} XP to profile ${profileId} (Total: ${newXp} XP)`,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Error updating XP for profile ${profileId}: ${msg}`);
    }
  }

  reconnectPlayer(duelId: string, playerId: string, newSocket: WebSocket): boolean {
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
          message: "L'adversaire s'est déconnecté du match.",
        },
      });

      this.endMatch(duelId);
    }

    this.socketToRoom.delete(socket);
  }

  removeRoom(duelId: string): void {
    const room = this.rooms.get(duelId);
    if (!room) return;

    if (room.roundTimeoutTimer) clearTimeout(room.roundTimeoutTimer);
    if (room.resolutionTimer) clearTimeout(room.resolutionTimer);

    this.playerToRoom.delete(room.player1.id);
    this.playerToRoom.delete(room.player2.id);
    this.socketToRoom.delete(room.player1.socket);
    this.socketToRoom.delete(room.player2.socket);
    this.rooms.delete(duelId);

    this.logger.log(`Room ${duelId} purged from memory`);
  }
}
