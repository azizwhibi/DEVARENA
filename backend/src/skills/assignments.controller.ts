import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard, DeveloperGuard } from '../auth/guards';
import { AssignmentsService } from './assignments.service';
type AuthRequest = Request & { user: { id: string } };
@Controller('admin/developers')
@UseGuards(AdminGuard)
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}
  @Get(':userId/skills') list(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.assignments.list(userId);
  }
  @Post(':userId/skills/:skillId') assign(
    @Req() req: AuthRequest,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('skillId', ParseUUIDPipe) skillId: string,
  ) {
    return this.assignments.assign(req.user.id, userId, skillId, true);
  }
  @Delete(':userId/skills/:skillId') remove(
    @Req() req: AuthRequest,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('skillId', ParseUUIDPipe) skillId: string,
  ) {
    return this.assignments.assign(req.user.id, userId, skillId, false);
  }
}
@Controller('me/skill-assignments')
@UseGuards(DeveloperGuard)
export class MyAssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.assignments.list(req.user.id);
  }
}
@Controller('skill-challenges')
@UseGuards(DeveloperGuard)
export class PracticeDirectoryController {
  constructor(private readonly assignments: AssignmentsService) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.assignments.challenges(req.user.id);
  }
}
