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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard, UserGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { KnowledgeCatalogueService } from './knowledge-catalogue.service';
import { KnowledgeLearningService } from './knowledge-learning.service';
import { KnowledgeRecommendationsService } from './knowledge-recommendations.service';
import { KnowledgeImportService } from './knowledge-import.service';
import { KnowledgeExplanationService } from './knowledge-explanation.service';
import {
  AdminKnowledgeQuery,
  EventDto,
  FeedbackDto,
  ImportDto,
  KnowledgeQuery,
  ProgressDto,
  ResourceDto,
  UpdateResourceDto,
  ExplainLessonDto,
} from './knowledge.dto';

@Controller('knowledge')
@UseGuards(UserGuard)
export class KnowledgeController {
  constructor(
    private readonly catalogue: KnowledgeCatalogueService,
    private readonly learning: KnowledgeLearningService,
    private readonly explanation: KnowledgeExplanationService,
  ) {}
  @Get('meta') @Header('Cache-Control', 'private, no-store') meta() {
    return this.catalogue.meta();
  }
  @Get('resources') @Header('Cache-Control', 'private, no-store') async list(
    @Query() query: KnowledgeQuery,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.catalogue.list(query);
    return {
      ...result,
      items: await this.learning.decorate(user.id, result.items),
    };
  }
  @Get('resources/:id')
  @Header('Cache-Control', 'private, no-store')
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return {
      ...(await this.catalogue.detail(id)),
      ...(await this.learning.state(user.id, id)),
    };
  }
  @Get('resources/:id/offline')
  @Header('Cache-Control', 'private, no-store')
  async offline(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogue.offline(id);
  }
  @Post('resources/:id/explain')
  @Header('Cache-Control', 'private, no-store')
  explain(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() _dto: ExplainLessonDto,
  ) {
    return this.explanation.explain(user.id, id);
  }
}
@Controller('me/knowledge')
@UseGuards(UserGuard)
export class MyKnowledgeController {
  constructor(
    private readonly learning: KnowledgeLearningService,
    private readonly recommendations: KnowledgeRecommendationsService,
  ) {}
  @Get('bookmarks') @Header('Cache-Control', 'private, no-store') bookmarks(
    @CurrentUser() user: AuthUser,
    @Query() query: KnowledgeQuery,
  ) {
    return this.learning.records(
      user.id,
      'bookmarks',
      query.page,
      query.pageSize,
    );
  }
  @Put('bookmarks/:id') bookmark(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.learning.activity(user.id, id, 'bookmark');
  }
  @Delete('bookmarks/:id') unbookmark(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.learning.removeBookmark(user.id, id);
  }
  @Get('progress') @Header('Cache-Control', 'private, no-store') progress(
    @CurrentUser() user: AuthUser,
    @Query() query: KnowledgeQuery,
  ) {
    return this.learning.records(
      user.id,
      'progress',
      query.page,
      query.pageSize,
    );
  }
  @Patch('progress/:id') update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProgressDto,
  ) {
    return this.learning.activity(user.id, id, 'progress', dto.percentage);
  }
  @Get('recommendations')
  @Header('Cache-Control', 'private, no-store')
  recommend(@CurrentUser() user: AuthUser) {
    return this.recommendations.recommend(user.id);
  }
  @Post('feedback') feedback(
    @CurrentUser() user: AuthUser,
    @Body() dto: FeedbackDto,
  ) {
    return this.learning.feedback(user.id, dto);
  }
  @Post('events') event(@CurrentUser() user: AuthUser, @Body() dto: EventDto) {
    return this.learning.event(user.id, dto);
  }
}
@Controller('admin/knowledge')
@UseGuards(AdminGuard)
export class AdminKnowledgeController {
  constructor(
    private readonly catalogue: KnowledgeCatalogueService,
    private readonly importer: KnowledgeImportService,
  ) {}
  @Get('resources') @Header('Cache-Control', 'private, no-store') list(
    @Query() query: AdminKnowledgeQuery,
  ) {
    return this.catalogue.list(query, true);
  }
  @Get('resources/:id') @Header('Cache-Control', 'private, no-store') preview(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogue.detail(id, true);
  }
  @Post('resources') create(
    @Body() dto: ResourceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalogue.save(null, dto, user.id);
  }
  @Patch('resources/:id') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResourceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.catalogue.save(id, dto, user.id);
  }
  @Post('resources/:id/publish') publish(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogue.publish(id);
  }
  @Post('resources/:id/archive') archive(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogue.archive(id);
  }
  @Delete('resources/:id') remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogue.remove(id);
  }
  @Post('import') import(
    @Body() dto: ImportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.importer.import(dto, user.id);
  }
}
