import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { UserGuard } from '../../auth/guards';
import { AiCoachService } from './ai-coach.service';

type AuthedRequest = Request & { user?: { id: string } };

@ApiTags('me / coach')
@ApiBearerAuth()
@UseGuards(UserGuard)
@Controller('me/coach')
export class AiCoachController {
  constructor(private readonly coach: AiCoachService) {}

  @Get('recommendation')
  @ApiOperation({
    summary: 'Recommandation IA personnalisée',
    description:
      'Retourne toujours 200. source="ai" si le modèle répond, "fallback" sinon.',
  })
  @ApiQuery({
    name: 'refresh',
    required: false,
    type: Boolean,
    description: 'Force une nouvelle analyse en temps réel par Gemini',
  })
  async recommend(
    @Req() req: AuthedRequest,
    @Query('refresh') refresh?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    const forceRefresh = refresh === 'true' || refresh === '1';
    return this.coach.recommend(userId, forceRefresh);
  }
}
