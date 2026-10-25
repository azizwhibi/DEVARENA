import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { OptionalAuthGuard } from '../auth/guards';
import { RankingsService } from './rankings.service';
import { RankingsQueryDto } from './dto/rankings-query.dto';

@ApiTags('rankings')
@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  getRankings(@Query() query: RankingsQueryDto, @Req() req: Request) {
    return this.rankingsService.getRankings(query, req.user);
  }
}
