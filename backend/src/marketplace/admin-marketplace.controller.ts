import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from '../auth/guards';
import type { AuthUser } from '../auth/auth.types';
import { GrantCreditsDto } from './dto/grant-credits.dto';
import { SaveMarketplaceItemDto } from './dto/save-marketplace-item.dto';
import { MarketplaceUserThrottlerGuard } from './marketplace-user-throttler.guard';
import { MarketplaceService } from './marketplace.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/marketplace')
export class AdminMarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get('challenges')
  challenges(@Req() req: Request & { user: AuthUser }) {
    return this.marketplace.listChallenges(req.user.id);
  }

  @Get('items')
  list(@Req() req: Request & { user: AuthUser }) {
    return this.marketplace.listAdmin(req.user.id);
  }

  @Post('items')
  create(
    @Req() req: Request & { user: AuthUser },
    @Body() dto: SaveMarketplaceItemDto,
  ) {
    return this.marketplace.saveItem(req.user.id, dto, null);
  }

  @Patch('items/:id')
  replace(
    @Req() req: Request & { user: AuthUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveMarketplaceItemDto,
  ) {
    return this.marketplace.saveItem(req.user.id, dto, id);
  }

  @Post('items/:id/archive')
  archive(
    @Req() req: Request & { user: AuthUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.marketplace.archiveItem(req.user.id, id);
  }

  @Post('credits')
  @UseGuards(MarketplaceUserThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  grant(
    @Req() req: Request & { user: AuthUser },
    @Body() dto: GrantCreditsDto,
  ) {
    return this.marketplace.grant(
      req.user.id,
      dto.user_id,
      dto.amount,
      dto.reason,
    );
  }
}
