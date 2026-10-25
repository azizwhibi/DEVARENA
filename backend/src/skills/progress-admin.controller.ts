import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards';
import { SupabaseService } from './skills-database.service';
import {
  ATTEMPT_VALIDATED,
  AttemptValidatedEvent,
} from './events/attempt-validated.event';
import { SkillProgressService } from './skill-progress.service';

@ApiTags('admin / progress')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/progress')
export class ProgressAdminController {
  constructor(
    private readonly progress: SkillProgressService,
    private readonly events: EventEmitter2,
    private readonly supabase: SupabaseService,
  ) {}

  @Get('users/:userId')
  userProgress(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.progress.getUserProgress(userId);
  }

  @Post('users/:userId/skills/:skillId/recalculate')
  @HttpCode(200)
  recalculate(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('skillId', new ParseUUIDPipe()) skillId: string,
  ) {
    return this.progress.recalculate(userId, skillId);
  }

  // Enregistre une tentative de défi et déclenche le recalcul dynamique
  @Post('users/:userId/challenges/:challengeId/attempt')
  @HttpCode(200)
  async recordAttempt(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('challengeId', new ParseUUIDPipe()) challengeId: string,
    @Body() body?: { isSuccess?: boolean; skillId?: string; accuracy?: number },
  ) {
    const isSuccess = body?.isSuccess ?? true;
    const accuracy =
      body?.accuracy != null ? Number(body.accuracy) : isSuccess ? 1.0 : 0.0;
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

  // Simulation d'un defi resolu avec succes : enregistre la tentative et déclenche le recalcul dynamique
  @Post('users/:userId/challenges/:challengeId/simulate-validated')
  @HttpCode(200)
  async simulate(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('challengeId', new ParseUUIDPipe()) challengeId: string,
  ) {
    return this.recordAttempt(userId, challengeId, {
      isSuccess: true,
      accuracy: 1.0,
    });
  }
}
