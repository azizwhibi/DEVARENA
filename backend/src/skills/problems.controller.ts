import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard, UserGuard } from '../auth/guards';
import { ProblemsService } from './problems.service';
import {
  ProblemQuery,
  ProblemWrite,
  TopicLinks,
  TopicWrite,
} from './problems.dto';
type UserRequest = Request & { user: { id: string } };
@Controller('problems')
@UseGuards(UserGuard)
export class ProblemsController {
  constructor(private readonly service: ProblemsService) {}
  @Get('topics') topics() {
    return this.service.topics();
  }
  @Get() list(@Req() req: UserRequest, @Query() query: ProblemQuery) {
    return this.service.list(req.user.id, query);
  }
}
@Controller('admin/problems')
@UseGuards(AdminGuard)
export class ProblemsAdminController {
  constructor(private readonly service: ProblemsService) {}
  @Get('topics') topics() {
    return this.service.topics(true);
  }
  @Post('topics') create(@Body() dto: TopicWrite) {
    return this.service.save(dto);
  }
  @Patch('topics/:id') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TopicWrite,
  ) {
    return this.service.save(dto, id);
  }
  @Get() list(@Req() req: UserRequest, @Query() query: ProblemQuery) {
    return this.service.list(req.user.id, query, true);
  }
  @Put(':id/topics') links(
    @Req() req: UserRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TopicLinks,
  ) {
    return this.service.links(req.user.id, id, dto.topicIds);
  }
  @Get(':id') detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.detail(id);
  }
  @Post() createProblem(@Req() req: UserRequest, @Body() dto: ProblemWrite) {
    return this.service.write(req.user.id, null, dto);
  }
  @Patch(':id') updateProblem(
    @Req() req: UserRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProblemWrite,
  ) {
    return this.service.write(req.user.id, id, dto);
  }
  @Post(':id/publish') publish(
    @Req() req: UserRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.action(req.user.id, id, 'publish');
  }
  @Post(':id/archive') archive(
    @Req() req: UserRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.action(req.user.id, id, 'archive');
  }
  @Delete(':id') remove(
    @Req() req: UserRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.action(req.user.id, id, 'delete');
  }
}
