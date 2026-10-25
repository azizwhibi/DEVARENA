import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserGuard } from '../auth/guards';
import type { AuthUser } from '../auth/auth.types';
import { EquipDto } from './dto/equip.dto';
import { UnequipDto } from './dto/unequip.dto';
import { MarketplaceUserThrottlerGuard } from './marketplace-user-throttler.guard';
import { MarketplaceService } from './marketplace.service';

const userLimit = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('marketplace')
@ApiBearerAuth()
@UseGuards(UserGuard)
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get('balance')
  balance(@Req() req: Request & { user: AuthUser }) {
    return this.marketplace.getBalance(req.user.id);
  }

  @Get('items')
  list(@Req() req: Request & { user: AuthUser }) {
    return this.marketplace.listItems(req.user.id);
  }

  @Get('items/:id')
  item(
    @Req() req: Request & { user: AuthUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.marketplace.getItem(req.user.id, id);
  }

  @Post('items/:id/purchase')
  @UseGuards(MarketplaceUserThrottlerGuard)
  @Throttle(userLimit)
  purchase(
    @Req() req: Request & { user: AuthUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.marketplace.purchase(req.user.id, id);
  }

  @Get('inventory')
  inventory(@Req() req: Request & { user: AuthUser }) {
    return this.marketplace.inventory(req.user.id);
  }

  @Post('equip')
  @UseGuards(MarketplaceUserThrottlerGuard)
  @Throttle(userLimit)
  equip(@Req() req: Request & { user: AuthUser }, @Body() dto: EquipDto) {
    return this.marketplace.equip(req.user.id, dto.item_id);
  }

  @Post('unequip')
  @UseGuards(MarketplaceUserThrottlerGuard)
  @Throttle(userLimit)
  unequip(@Req() req: Request & { user: AuthUser }, @Body() dto: UnequipDto) {
    return this.marketplace.unequip(req.user.id, dto.slot);
  }

  @Get('items/:id/hint')
  @UseGuards(MarketplaceUserThrottlerGuard)
  @Throttle(userLimit)
  hint(
    @Req() req: Request & { user: AuthUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.marketplace.hint(req.user.id, id);
  }
}
