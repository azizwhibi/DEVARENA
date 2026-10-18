import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from './current-user.decorator';
import { UserGuard } from './guards';
import type { AuthUser } from './auth.types';

@ApiTags('auth')
@ApiBearerAuth()
@UseGuards(UserGuard)
@Controller('me')
export class MeController {
  @Get()
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
