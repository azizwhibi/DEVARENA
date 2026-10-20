import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { IncomingMessage } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { AuthService } from '../auth/auth.service';
import { DuelMatchmakingService } from './duel-matchmaking.service';
import { DuelRoomService } from './duel-room.service';
import type {
  AuthenticatedPlayer,
  DuelJoinPayload,
  DuelMatchAcceptPayload,
  DuelMatchDeclinePayload,
  DuelSubmitAnswerPayload,
} from './duel.types';

@WebSocketGateway({
  path: '/duel',
  cors: {
    origin: '*',
  },
})
export class DuelGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(DuelGateway.name);
  private readonly authenticatedPlayers = new Map<
    WebSocket,
    AuthenticatedPlayer
  >();

  constructor(
    private readonly authService: AuthService,
    private readonly matchmakingService: DuelMatchmakingService,
    private readonly roomService: DuelRoomService,
  ) {}

  afterInit() {
    this.logger.log('Duel WebSocket Gateway initialized on path /duel');
  }

  async handleConnection(client: WebSocket, req?: IncomingMessage) {
    const player = await this.authenticateSocket(client, req);
    this.authenticatedPlayers.set(client, player);
    this.logger.log(
      `Duel client connected: ${player.name} (${player.id}) [guest=${player.isGuest}]`,
    );
  }

  handleDisconnect(client: WebSocket) {
    const player = this.authenticatedPlayers.get(client);
    this.logger.log(
      `Duel client disconnected: ${player?.name ?? 'unknown'} (${player?.id ?? 'n/a'})`,
    );

    // 1. Retrait propre de la file de matchmaking si en attente
    this.matchmakingService.removeFromQueue(client);

    // 2. Gestion de la déconnexion dans la salle de match active
    this.roomService.handlePlayerDisconnect(client);

    // 3. Purge de la session authentifiée
    this.authenticatedPlayers.delete(client);
  }

  @SubscribeMessage('DUEL_JOIN')
  handleJoin(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload?: DuelJoinPayload,
  ) {
    const player = this.authenticatedPlayers.get(client);
    const playerId =
      payload?.playerId || player?.id || `guest_${randomUUID().slice(0, 8)}`;
    const playerName =
      payload?.playerName || player?.name || `Dev_${playerId.slice(-4)}`;

    if (player) {
      player.id = playerId;
      player.name = playerName;
    }

    // Si le joueur spécifie une salle existante active (reconnexion ou duel direct)
    if (
      payload?.duelId &&
      payload.duelId !== 'matchmaking' &&
      payload.duelId !== 'queue'
    ) {
      const room = this.roomService.getRoom(payload.duelId);
      if (room) {
        this.roomService.reconnectPlayer(room.duelId, playerId, client);
        this.logger.log(
          `Player ${playerName} reconnected to existing room ${room.duelId}`,
        );
        return;
      }
    }

    // Sinon, inscription dans la file d'attente de matchmaking
    this.matchmakingService.addToQueue({
      playerId,
      playerName,
      socket: client,
      joinedAt: new Date(),
    });
  }

  @SubscribeMessage('DUEL_SUBMIT_ANSWER')
  handleSubmitAnswer(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload: DuelSubmitAnswerPayload,
  ) {
    const player = this.authenticatedPlayers.get(client);
    const playerId = player?.id || 'player-1';

    this.roomService.submitAnswer(
      payload.duelId,
      playerId,
      payload.roundIndex,
      payload.selectedIndex,
      payload.timeRemainingMs,
      client,
    );
  }

  @SubscribeMessage('DUEL_QUEUE_LEAVE')
  handleLeaveQueue(@ConnectedSocket() client: WebSocket) {
    this.matchmakingService.removeFromQueue(client);
  }

  @SubscribeMessage('DUEL_MATCH_ACCEPT')
  handleMatchAccept(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload: DuelMatchAcceptPayload,
  ) {
    const player = this.authenticatedPlayers.get(client);
    const playerId = player?.id || 'guest';
    this.logger.log(
      `Player ${player?.name || playerId} accepted match ${payload?.duelId}`,
    );
    this.matchmakingService.acceptMatch(payload?.duelId, playerId);
  }

  @SubscribeMessage('DUEL_MATCH_DECLINE')
  handleMatchDecline(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload: DuelMatchDeclinePayload,
  ) {
    const player = this.authenticatedPlayers.get(client);
    const playerId = player?.id || 'guest';
    this.logger.log(
      `Player ${player?.name || playerId} declined match ${payload?.duelId}`,
    );
    this.matchmakingService.declineMatch(payload?.duelId, playerId);
  }

  /**
   * Extraction et validation du token JWT Supabase lors de la négociation WebSocket.
   * Fallback identifiant invité pour les tests si aucun token n'est fourni.
   */
  private async authenticateSocket(
    client: WebSocket,
    req?: IncomingMessage,
  ): Promise<AuthenticatedPlayer> {
    const url = new URL(req?.url ?? '/', 'http://localhost');
    const tokenFromQuery =
      url.searchParams.get('token') || url.searchParams.get('access_token');
    const headerAuth = req?.headers?.['authorization'];
    const authHeader = headerAuth || (tokenFromQuery ? `Bearer ${tokenFromQuery}` : undefined);

    const guestPlayerId = url.searchParams.get('playerId');
    const guestPlayerName =
      url.searchParams.get('playerName') || url.searchParams.get('name');

    if (authHeader) {
      try {
        const authUser = await this.authService.authenticate(authHeader);
        return {
          id: authUser.id,
          name:
            guestPlayerName ||
            authUser.email.split('@')[0] ||
            'Developer',
          email: authUser.email,
          isGuest: false,
          socket: client,
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `WebSocket JWT authentication failed, falling back to guest: ${errMsg}`,
        );
      }
    }

    // Fallback invité
    const fallbackId = guestPlayerId || `guest_${randomUUID().slice(0, 8)}`;
    const fallbackName = guestPlayerName || `Invité_${fallbackId.slice(-4)}`;
    return {
      id: fallbackId,
      name: fallbackName,
      isGuest: true,
      socket: client,
    };
  }
}
