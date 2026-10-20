import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from '../auth/guards';
import { ChallengeSkillsService } from './challenge-skills.service';
import { SetChallengeSkillsDto } from './dto/challenge-skills.dto';

type AuthedRequest = Request & { user?: { id: string | null } };

@ApiTags('admin / challenge-skills')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/challenges')
export class ChallengeSkillsController {
  constructor(private readonly links: ChallengeSkillsService) {}

  @Get(':id/skills')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.links.get(id);
  }

  @Put(':id/skills')
  replace(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetChallengeSkillsDto,
    @Req() req: AuthedRequest,
  ) {
    return this.links.replace(id, dto, req.user?.id ?? null);
  }
}
