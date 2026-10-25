import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserGuard } from '../auth/guards';
import { SupabaseService } from './skills-database.service';
import {
  ATTEMPT_VALIDATED,
  AttemptValidatedEvent,
} from './events/attempt-validated.event';
import { SkillProgressService } from './skill-progress.service';

type AuthedRequest = Request & { user?: { id: string } };

@ApiTags('me / skills')
@ApiBearerAuth()
@UseGuards(UserGuard)
@Controller('me/skills')
export class MeSkillsController {
  constructor(
    private readonly progress: SkillProgressService,
    private readonly supabase: SupabaseService,
    private readonly events: EventEmitter2,
  ) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.progress.getUserProgressWithDelta(req.user!.id);
  }

  @Get(':skillId/history')
  history(
    @Req() req: AuthedRequest,
    @Param('skillId', new ParseUUIDPipe()) skillId: string,
  ) {
    return this.progress.getUserHistory(req.user!.id, skillId);
  }

  @Post('challenges/:challengeId/attempt')
  @HttpCode(200)
  async recordMyAttempt(
    @Req() req: AuthedRequest,
    @Param('challengeId', new ParseUUIDPipe()) challengeId: string,
    @Body() body?: { isSuccess?: boolean; accuracy?: number },
  ) {
    const userId = req.user!.id;
    const isSuccess = body?.isSuccess ?? true;
    const rawAccuracy =
      body?.accuracy != null ? Number(body.accuracy) : isSuccess ? 1.0 : 0.0;
    const accuracy = Math.max(0, Math.min(1, rawAccuracy));
    const isValidated = Boolean(isSuccess && accuracy > 0);

    const { error } = await this.supabase.client.from('attempts').insert({
      user_id: userId,
      challenge_id: challengeId,
      accuracy,
      is_validated: isValidated,
    });
    if (error) throw error;

    if (isValidated) {
      this.events.emit(
        ATTEMPT_VALIDATED,
        new AttemptValidatedEvent(userId, challengeId),
      );
    }

    return {
      success: true,
      challengeId,
      userId,
      isSuccess: isValidated,
      accuracy,
    };
  }

  @Post('duel/attempt')
  @HttpCode(200)
  async recordDuelAttempt(
    @Req() req: AuthedRequest,
    @Body()
    body?: {
      correctAnswers?: number;
      totalQuestions?: number;
      accuracy?: number;
    },
  ) {
    const userId = req.user!.id;
    let accuracy = 0;
    if (body?.accuracy != null) {
      accuracy = Math.max(0, Math.min(1, Number(body.accuracy)));
    } else if (body?.correctAnswers != null && body?.totalQuestions) {
      accuracy = Math.max(
        0,
        Math.min(1, Number(body.correctAnswers) / Number(body.totalQuestions)),
      );
    }
    const isValidated = accuracy >= 0.5;

    // Find a challenge linked to a skill to associate this duel attempt with
    const { data: challenges } = await this.supabase.client
      .from('challenge_skills')
      .select('challenge_id')
      .limit(1);

    const challengeId = challenges?.[0]?.challenge_id;
    if (!challengeId) {
      return { success: true, userId, accuracy, isSuccess: isValidated };
    }

    const { error } = await this.supabase.client.from('attempts').insert({
      user_id: userId,
      challenge_id: challengeId,
      accuracy,
      is_validated: isValidated,
      metadata: { source: 'battle_duel' },
    });
    if (error) throw error;

    if (isValidated) {
      this.events.emit(
        ATTEMPT_VALIDATED,
        new AttemptValidatedEvent(userId, challengeId),
      );
    }

    return {
      success: true,
      challengeId,
      userId,
      isSuccess: isValidated,
      accuracy,
    };
  }
}
