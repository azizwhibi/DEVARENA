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
import { OptionalAuthGuard, UserGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { CommunityService } from './community.service';
import {
  CommunityQueryDto,
  CreateCommentDto,
  CreatePostDto,
  ReportDto,
  UpdateCommentDto,
  UpdatePostDto,
  VotePostDto,
} from './community.dto';

@Controller('community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('categories')
  @Header('Cache-Control', 'private, no-store')
  async listCategories() {
    return this.community.listCategories();
  }

  @Get('sidebar')
  @Header('Cache-Control', 'private, no-store')
  async getSidebar() {
    return this.community.getSidebarData();
  }

  @Get('posts')
  @UseGuards(OptionalAuthGuard)
  @Header('Cache-Control', 'private, no-store')
  async listPosts(
    @Query() query: CommunityQueryDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.community.listPosts(query, user?.id);
  }

  @Get('posts/:id')
  @UseGuards(OptionalAuthGuard)
  @Header('Cache-Control', 'private, no-store')
  async getPost(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.community.getPost(id, user?.id);
  }

  @Post('posts')
  @UseGuards(UserGuard)
  async createPost(
    @Body() dto: CreatePostDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.community.createPost(dto, user.id);
  }

  @Patch('posts/:id')
  @UseGuards(UserGuard)
  async updatePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.community.updatePost(id, dto, user.id, user.role === 'admin');
  }

  @Delete('posts/:id')
  @UseGuards(UserGuard)
  async deletePost(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.community.deletePost(id, user.id, user.role === 'admin');
    return { success: true };
  }

  @Post('posts/:id/vote')
  @UseGuards(UserGuard)
  async votePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VotePostDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.community.votePost(id, dto.vote, user.id);
  }

  @Post('posts/:id/bookmark')
  @UseGuards(UserGuard)
  async toggleBookmark(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.community.toggleBookmark(id, user.id);
  }

  @Get('posts/:id/comments')
  @Header('Cache-Control', 'private, no-store')
  async listComments(@Param('id', ParseUUIDPipe) id: string) {
    return this.community.listComments(id);
  }

  @Post('posts/:id/comments')
  @UseGuards(UserGuard)
  async createComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.community.createComment(id, dto, user.id);
  }

  @Patch('comments/:id')
  @UseGuards(UserGuard)
  async updateComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.community.updateComment(id, dto, user.id, user.role === 'admin');
  }

  @Delete('comments/:id')
  @UseGuards(UserGuard)
  async deleteComment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.community.deleteComment(id, user.id, user.role === 'admin');
    return { success: true };
  }

  @Post('posts/:postId/accept-answer/:commentId')
  @UseGuards(UserGuard)
  async acceptAnswer(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.community.acceptAnswer(postId, commentId, user.id);
  }

  @Post('reports')
  @UseGuards(UserGuard)
  async report(
    @Body() dto: ReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.community.report(dto, user.id);
  }

  @Get('me/posts')
  @UseGuards(UserGuard)
  async listMyPosts(
    @CurrentUser() user: AuthUser,
    @Query() query: CommunityQueryDto,
  ) {
    return this.community.listPosts({ ...query, authorId: user.id }, user.id);
  }

  @Get('me/saved')
  @UseGuards(UserGuard)
  async listMySaved(@CurrentUser() user: AuthUser) {
    return this.community.listUserBookmarks(user.id);
  }
}
