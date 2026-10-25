import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RankingsService } from './rankings.service';
import { GetRankingsQueryDto } from './dto/get-rankings-query.dto';
import { OptionalAuthGuard, UserGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import type { GetRankingsResponse, UserRankMetrics } from './rankings.types';

@ApiTags('Rankings')
@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: 'Get paginated rankings with optional current user position',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated rankings leaderboard list',
  })
  async getRankings(
    @Query() query: GetRankingsQueryDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<GetRankingsResponse> {
    return this.rankingsService.getRankings(query, user?.id);
  }

  @Get('me')
  @UseGuards(UserGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current authenticated user ranking and dev score metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'User ranking and detailed dev score metrics',
  })
  @ApiResponse({
    status: 404,
    description: 'Ranking not found for current user',
  })
  async getMyRank(
    @CurrentUser() user: AuthUser,
  ): Promise<UserRankMetrics> {
    return this.rankingsService.getUserRankMetrics(user.id);
  }
}
