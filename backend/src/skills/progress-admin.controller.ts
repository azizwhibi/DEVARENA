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

  // Enregistre une tentative de défi (succès -> +score, échec -> -score) avec trace en historique
  @Post('users/:userId/challenges/:challengeId/attempt')
  @HttpCode(200)
  async recordAttempt(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('challengeId', new ParseUUIDPipe()) challengeId: string,
    @Body() body?: { isSuccess?: boolean; skillId?: string },
  ) {
    const isSuccess = body?.isSuccess ?? true;
    const result = await this.progress.applyAttemptResult(
      userId,
      challengeId,
      isSuccess,
      body?.skillId,
    );

    if (isSuccess) {
      this.events.emit(
        ATTEMPT_VALIDATED,
        new AttemptValidatedEvent(userId, challengeId),
      );
    }

    return { success: true, challengeId, ...result };
  }

  // Simulation d'un defi resolu avec succes : enregistre la tentative et met a jour le score en direct
  @Post('users/:userId/challenges/:challengeId/simulate-validated')
  @HttpCode(200)
  async simulate(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('challengeId', new ParseUUIDPipe()) challengeId: string,
  ) {
    const result = await this.progress.applyAttemptResult(
      userId,
      challengeId,
      true,
    );
    this.events.emit(
      ATTEMPT_VALIDATED,
      new AttemptValidatedEvent(userId, challengeId),
    );

    return { success: true, challengeId, ...result };
  }
}
