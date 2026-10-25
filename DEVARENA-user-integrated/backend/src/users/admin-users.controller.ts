import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from './users.service';
import { ListUsersQueryDto } from './dto/list-users.query';
import { SetRoleDto } from './dto/set-role.dto';
import { SetStatusDto } from './dto/set-status.dto';

interface RequestWithUser {
  user: AuthUser;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Patch(':id/role')
  async setRole(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetRoleDto,
  ) {
    return this.usersService.setRole(req.user.id, id, dto.role);
  }

  @Patch(':id/status')
  async setStatus(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetStatusDto,
  ) {
    return this.usersService.setStatus(req.user.id, id, dto.status, dto.reason);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteUser(
    @Req() req: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.usersService.deleteUserByAdmin(req.user.id, id);
  }
}
