import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from './guards';

// Temporary verification endpoint for Phase 4 / T11 cutover.
// Removed in Phase 6 (T18: List users).
// Source: https://docs.nestjs.com/guards#binding-guards
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminPingController {
  @Get('ping')
  ping(): { message: string } {
    return { message: 'pong' };
  }
}
