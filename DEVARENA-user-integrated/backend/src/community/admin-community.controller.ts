import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { CommunityAdminService } from './community-admin.service';
import {
  CreateCategoryDto,
  ModeratePostDto,
  ReviewReportDto,
  UpdateCategoryDto,
} from './community.dto';

@Controller('admin/community')
@UseGuards(AdminGuard)
export class AdminCommunityController {
  constructor(private readonly adminService: CommunityAdminService) {}

  @Post('categories')
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.createCategory(dto, user.id);
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateCategory(id, dto, user.id);
  }

  @Delete('categories/:id')
  async deleteCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.adminService.deleteCategory(id, user.id);
    return { success: true };
  }

  @Patch('posts/:id/moderate')
  async moderatePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModeratePostDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.moderatePost(id, dto, user.id);
  }

  @Get('reports')
  @Header('Cache-Control', 'private, no-store')
  async listReports(@Query('status') status?: string) {
    return this.adminService.listReports(status);
  }

  @Patch('reports/:id')
  async reviewReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.reviewReport(id, dto, user.id);
  }

  @Get('logs')
  @Header('Cache-Control', 'private, no-store')
  async listLogs() {
    return this.adminService.listModerationLogs();
  }
}
