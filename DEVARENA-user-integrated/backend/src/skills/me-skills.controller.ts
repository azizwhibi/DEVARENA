import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserGuard } from '../auth/guards';
import { SkillProgressService } from './skill-progress.service';

type AuthedRequest = Request & { user?: { id: string } };

@ApiTags('me / skills')
@ApiBearerAuth()
@UseGuards(UserGuard)
@Controller('me/skills')
export class MeSkillsController {
  constructor(private readonly progress: SkillProgressService) {}

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
}
