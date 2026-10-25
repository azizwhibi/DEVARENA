import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserGuard } from '../auth/guards';
import type { AuthUser } from '../auth/auth.types';
import { UsersService, UserProfileResponse } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DeleteMeDto } from './dto/delete-me.dto';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(UserGuard)
@Controller('me')
export class MeProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(
    @CurrentUser() user: AuthUser,
  ): Promise<UserProfileResponse> {
    return this.usersService.getProfile(user.id);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteMeDto,
  ): Promise<void> {
    await this.usersService.deleteMe(user.id, dto.confirmUsername);
  }
}
