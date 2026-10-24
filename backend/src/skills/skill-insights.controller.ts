import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from '../auth/guards';
import { UserGuard } from '../auth/guards';
import { SkillInsightsService } from './skill-insights.service';

type AuthedRequest = Request & { user?: { id: string | null } };

@ApiTags('me / skills')
@ApiBearerAuth()
@UseGuards(UserGuard)
@Controller('me/skills')
export class MeSkillChallengesController {
  constructor(private readonly insights: SkillInsightsService) {}

  @Get(':skillId/challenges')
  challenges(
    @Param('skillId', new ParseUUIDPipe()) skillId: string,
    @Req() req: AuthedRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.insights.challengesForUser(userId, skillId);
  }
}

@ApiTags('admin / skills')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/skills')
export class SkillStatsController {
  constructor(private readonly insights: SkillInsightsService) {}

  @Get(':id/stats')
  stats(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.insights.stats(id);
  }
}
