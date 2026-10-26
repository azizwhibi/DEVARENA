import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserGuard } from '../../auth/guards';
import { PracticeService } from './practice.service';
import { PracticeAnswerDto } from './practice.dto';

type AuthRequest = Request & { user: { id: string } };

@ApiTags('me / practice')
@ApiBearerAuth()
@UseGuards(UserGuard)
@Controller('me/practice')
export class PracticeController {
  constructor(private readonly practice: PracticeService) {}

  @Get('summary') summary(@Req() req: AuthRequest) {
    return this.practice.summary(req.user.id);
  }

  @Post(':problemId/start')
  @HttpCode(200)
  start(
    @Req() req: AuthRequest,
    @Param('problemId', ParseUUIDPipe) problemId: string,
  ) {
    return this.practice.start(req.user.id, problemId);
  }

  @Post(':problemId/answer')
  @HttpCode(200)
  answer(
    @Req() req: AuthRequest,
    @Param('problemId', ParseUUIDPipe) problemId: string,
    @Body() body: PracticeAnswerDto,
  ) {
    return this.practice.answer(req.user.id, problemId, body);
  }
}
