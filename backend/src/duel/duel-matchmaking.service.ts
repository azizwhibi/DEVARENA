import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { ACCEPT_TIMEOUT_MS, safeSend } from './duel.constants';
import { DuelRoomService } from './duel-room.service';
import type {
  DuelMatchAcceptedUpdatePayload,
  DuelMatchCancelledPayload,
  DuelMatchFoundPayload,
  DuelMatchProposedPayload,
  DuelQueueWaitingPayload,
  DuelRoomSession,
  ProposedMatch,
  WaitingPlayer,
} from './duel.types';

@Injectable()
export class DuelMatchmakingService {
  private readonly logger = new Logger(DuelMatchmakingService.name);
  /**
   * File d'attente synchronisée en mémoire.
   * En Node.js, les opérations synchrones sur les tableaux dans l'event loop sont atomiques.
   */
  private queue: WaitingPlayer[] = [];

  /**
   * Sessions de match en cours de confirmation mutuelle ("Ready Check").
   */
  private readonly proposedMatches = new Map<string, ProposedMatch>();
  private readonly socketToProposedDuel = new Map<WebSocket, string>();
  private readonly playerToProposedDuel = new Map<string, string>();

  constructor(private readonly roomService: DuelRoomService) {}

  /**
   * Ajoute un joueur à la file de matchmaking.
   * Si 2 joueurs distincts sont disponibles, instancie la proposition et les notifie.
   */
  addToQueue(player: WaitingPlayer): {
    matched: boolean;
    duelId?: string;
    room?: DuelRoomSession;
  } {
    // 1. Nettoyage préventif des sockets fermées ou stale
    this.purgeStaleSockets();

    // 2. Vérification de non-duplication (même socket ou même playerId déjà en attente)
    const existingIndex = this.queue.findIndex(
      (p) => p.socket === player.socket || p.playerId === player.playerId,
    );
    if (existingIndex !== -1) {
      // Mise à jour de la socket existante si besoin
      this.queue[existingIndex] = player;
      this.logger.log(
        `Player ${player.playerName} (${player.playerId}) updated in matchmaking queue`,
      );
    } else {
      this.queue.push(player);
      this.logger.log(
        `Player ${player.playerName} (${player.playerId}) joined matchmaking queue. Position: ${this.queue.length}`,
      );
    }

    // Notifie le joueur qu'il est en attente
    const waitingPayload: DuelQueueWaitingPayload = {
      playerId: player.playerId,
      position: this.queue.length,
    };
    safeSend(player.socket, {
      type: 'DUEL_QUEUE_WAITING',
      payload: waitingPayload,
    });

    // 3. Dès que 2 joueurs distincts sont en attente, apparie-les
    return this.tryMatchPlayers();
  }

  /**
   * Retire un joueur de la file d'attente lors d'une déconnexion ou annulation.
   */
  removeFromQueue(target: WebSocket | string): boolean {
    // Si le joueur était dans une proposition de match active, décliner le match
    let proposedDuelId: string | undefined;
    let playerId: string | undefined;

    if (typeof target === 'string') {
      proposedDuelId = this.playerToProposedDuel.get(target);
      playerId = target;
    } else {
      proposedDuelId = this.socketToProposedDuel.get(target);
      // Trouver playerId associé
      for (const [pId, dId] of this.playerToProposedDuel.entries()) {
        if (dId === proposedDuelId) {
          playerId = pId;
          break;
        }
      }
    }

    if (proposedDuelId && playerId) {
      this.declineMatch(proposedDuelId, playerId);
    }

    const initialLen = this.queue.length;
    if (typeof target === 'string') {
      this.queue = this.queue.filter((p) => p.playerId !== target);
    } else {
      this.queue = this.queue.filter((p) => p.socket !== target);
    }

    const removed = this.queue.length < initialLen;
    if (removed) {
      this.logger.log(
        `Socket/Player removed from matchmaking queue. Remaining: ${this.queue.length}`,
      );
    }
    return removed;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isPlayerInQueue(playerId: string): boolean {
    return this.queue.some((p) => p.playerId === playerId);
  }

  getProposedMatch(duelId: string): ProposedMatch | undefined {
    return this.proposedMatches.get(duelId);
  }

  /**
   * Traitement de l'acceptation par un joueur ("Ready Check").
   * Si les deux joueurs ont accepté dans le délai, démarre officiellement le match.
   */
  acceptMatch(duelId: string, playerId: string): boolean {
    const proposal = this.proposedMatches.get(duelId);
    if (!proposal) {
      this.logger.warn(`Cannot accept match: proposal ${duelId} not found`);
      return false;
    }

    if (
      proposal.player1.playerId !== playerId &&
      proposal.player2.playerId !== playerId
    ) {
      this.logger.warn(
        `Player ${playerId} is not part of proposed match ${duelId}`,
      );
      return false;
    }

    proposal.acceptedPlayerIds.add(playerId);
    this.logger.log(
      `Player ${playerId} accepted match ${duelId}. Total accepted: ${proposal.acceptedPlayerIds.size}/2`,
    );

    // Diffusion de l'état d'acceptation aux deux participants
    const updatePayload: DuelMatchAcceptedUpdatePayload = {
      duelId,
      acceptedPlayerIds: Array.from(proposal.acceptedPlayerIds),
    };
    safeSend(proposal.player1.socket, {
      type: 'DUEL_MATCH_ACCEPTED_UPDATE',
      payload: updatePayload,
    });
    safeSend(proposal.player2.socket, {
      type: 'DUEL_MATCH_ACCEPTED_UPDATE',
      payload: updatePayload,
    });

    // Si les deux joueurs ont validé avant la fin du décompte
    if (
      proposal.acceptedPlayerIds.has(proposal.player1.playerId) &&
      proposal.acceptedPlayerIds.has(proposal.player2.playerId)
    ) {
      this.logger.log(
        `Both players accepted match ${duelId}! Launching round 1.`,
      );
      clearTimeout(proposal.timeoutTimer);
      this.cleanupProposal(duelId);

      // Création officielle de la salle et lancement du round 1
      const room = this.roomService.createRoom(
        duelId,
        proposal.player1,
        proposal.player2,
      );
      this.roomService.startRound(duelId, 0);
      return true;
    }

    return true;
  }

  /**
   * Traitement du refus de match par un joueur.
   * Annule le match, replace le joueur non-refusant en tête de file, et éjecte le joueur ayant refusé.
   */
  declineMatch(duelId: string, playerId: string): boolean {
    const proposal = this.proposedMatches.get(duelId);
    if (!proposal) {
      return false;
    }

    this.logger.log(`Match ${duelId} declined by player ${playerId}`);
    clearTimeout(proposal.timeoutTimer);
    this.cleanupProposal(duelId);

    // Notification d'annulation
    const cancelPayload: DuelMatchCancelledPayload = {
      duelId,
      reason: 'declined',
      byPlayerId: playerId,
    };
    safeSend(proposal.player1.socket, {
      type: 'DUEL_MATCH_CANCELLED',
      payload: cancelPayload,
    });
    safeSend(proposal.player2.socket, {
      type: 'DUEL_MATCH_CANCELLED',
      payload: cancelPayload,
    });

    // Replace le joueur resté actif en tête de file (unshift)
    const otherPlayer =
      proposal.player1.playerId === playerId
        ? proposal.player2
        : proposal.player1;

    if (otherPlayer.socket && otherPlayer.socket.readyState === 1 /* OPEN */) {
      this.queue.unshift(otherPlayer);
      this.logger.log(
        `Re-queued active player ${otherPlayer.playerName} at front of queue`,
      );
      safeSend(otherPlayer.socket, {
        type: 'DUEL_QUEUE_WAITING',
        payload: { playerId: otherPlayer.playerId, position: 1 },
      });
      // Tente immédiatement un nouvel appariement si d'autres joueurs attendent
      this.tryMatchPlayers();
    }

    return true;
  }

  /**
   * Compte à rebours serveur expiré (10s sans double confirmation).
   */
  private handleProposalTimeout(duelId: string): void {
    const proposal = this.proposedMatches.get(duelId);
    if (!proposal) return;

    this.logger.log(
      `Match proposal ${duelId} timed out after ${ACCEPT_TIMEOUT_MS}ms`,
    );
    this.cleanupProposal(duelId);

    // Notification d'annulation
    const cancelPayload: DuelMatchCancelledPayload = {
      duelId,
      reason: 'timeout',
    };
    safeSend(proposal.player1.socket, {
      type: 'DUEL_MATCH_CANCELLED',
      payload: cancelPayload,
    });
    safeSend(proposal.player2.socket, {
      type: 'DUEL_MATCH_CANCELLED',
      payload: cancelPayload,
    });

    // Replace en tête de file les joueurs qui avaient accepté (joueurs actifs)
    let reQueuedCount = 0;
    const players = [proposal.player1, proposal.player2];
    for (const p of players) {
      if (proposal.acceptedPlayerIds.has(p.playerId)) {
        if (p.socket && p.socket.readyState === 1 /* OPEN */) {
          this.queue.unshift(p);
          reQueuedCount++;
          this.logger.log(
            `Player ${p.playerName} had accepted; re-queued at front of queue`,
          );
          safeSend(p.socket, {
            type: 'DUEL_QUEUE_WAITING',
            payload: { playerId: p.playerId, position: 1 },
          });
        }
      } else {
        this.logger.log(
          `Player ${p.playerName} timed out (AFK); removed from queue`,
        );
      }
    }

    if (reQueuedCount > 0) {
      this.tryMatchPlayers();
    }
  }

  private cleanupProposal(duelId: string): void {
    const proposal = this.proposedMatches.get(duelId);
    if (proposal) {
      this.socketToProposedDuel.delete(proposal.player1.socket);
      this.socketToProposedDuel.delete(proposal.player2.socket);
      this.playerToProposedDuel.delete(proposal.player1.playerId);
      this.playerToProposedDuel.delete(proposal.player2.playerId);
      this.proposedMatches.delete(duelId);
    }
  }

  /**
   * Appariement atomique de 2 joueurs distincts dans la file.
   */
  private tryMatchPlayers(): {
    matched: boolean;
    duelId?: string;
    room?: DuelRoomSession;
  } {
    if (this.queue.length < 2) {
      return { matched: false };
    }

    // Trouver 2 joueurs distincts avec sockets actives
    const p1 = this.queue[0];
    const p2Index = this.queue.findIndex(
      (candidate, idx) =>
        idx > 0 &&
        candidate.playerId !== p1.playerId &&
        candidate.socket !== p1.socket &&
        candidate.socket.readyState === 1,
    );

    if (p2Index === -1) {
      return { matched: false };
    }

    // Retirer atomiquement les deux joueurs de la file
    const [player2] = this.queue.splice(p2Index, 1);
    const player1 = this.queue.shift()!;

    // Instancier un identifiant unique pour le duel
    const duelId = randomUUID();

    // 1. Enclenche le compte à rebours serveur strict de 10s (ACCEPT_TIMEOUT_MS)
    const timeoutTimer = setTimeout(() => {
      this.handleProposalTimeout(duelId);
    }, ACCEPT_TIMEOUT_MS);

    // 2. Crée la session d'attente "PROPOSED"
    const proposal: ProposedMatch = {
      duelId,
      player1,
      player2,
      acceptedPlayerIds: new Set<string>(),
      timeoutTimer,
      createdAt: Date.now(),
    };

    this.proposedMatches.set(duelId, proposal);
    this.socketToProposedDuel.set(player1.socket, duelId);
    this.socketToProposedDuel.set(player2.socket, duelId);
    this.playerToProposedDuel.set(player1.playerId, duelId);
    this.playerToProposedDuel.set(player2.playerId, duelId);

    // 3. Diffuse DUEL_MATCH_FOUND et DUEL_MATCH_PROPOSED aux deux sockets
    const p1FoundPayload: DuelMatchFoundPayload = {
      duelId,
      player: { id: player1.playerId, name: player1.playerName },
      opponent: { id: player2.playerId, name: player2.playerName },
    };

    const p2FoundPayload: DuelMatchFoundPayload = {
      duelId,
      player: { id: player2.playerId, name: player2.playerName },
      opponent: { id: player1.playerId, name: player1.playerName },
    };

    safeSend(player1.socket, {
      type: 'DUEL_MATCH_FOUND',
      payload: p1FoundPayload,
    });
    safeSend(player2.socket, {
      type: 'DUEL_MATCH_FOUND',
      payload: p2FoundPayload,
    });

    const p1Proposed: DuelMatchProposedPayload = {
      duelId,
      opponent: { id: player2.playerId, name: player2.playerName },
      timeoutMs: ACCEPT_TIMEOUT_MS,
    };

    const p2Proposed: DuelMatchProposedPayload = {
      duelId,
      opponent: { id: player1.playerId, name: player1.playerName },
      timeoutMs: ACCEPT_TIMEOUT_MS,
    };

    safeSend(player1.socket, {
      type: 'DUEL_MATCH_PROPOSED',
      payload: p1Proposed,
    });
    safeSend(player2.socket, {
      type: 'DUEL_MATCH_PROPOSED',
      payload: p2Proposed,
    });

    this.logger.log(
      `Match proposed! Duel ${duelId}: ${player1.playerName} vs ${player2.playerName} (awaiting 10s confirmation)`,
    );

    return { matched: true, duelId };
  }

  private purgeStaleSockets(): void {
    this.queue = this.queue.filter(
      (p) => p.socket && p.socket.readyState === 1 /* OPEN */,
    );
  }
}
