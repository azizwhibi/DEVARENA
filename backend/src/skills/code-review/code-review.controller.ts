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
import { CodeReviewDto } from './code-review.dto';
import { CodeReviewService } from './code-review.service';

@ApiTags('code reviews')
@ApiBearerAuth()
@UseGuards(UserGuard)
@Controller('me/code-reviews')
export class CodeReviewController {
  constructor(private readonly service: CodeReviewService) {}
  @Get('summary') summary(@Req() req: Request) {
    return this.service.summary(req.user!.id);
  }
  @Get('problems/:problemId') detail(
    @Req() req: Request,
    @Param('problemId', ParseUUIDPipe) id: string,
  ) {
    return this.service.detail(req.user!.id, id);
  }
  @Post('problems/:problemId')
  @HttpCode(200)
  submit(
    @Req() req: Request,
    @Param('problemId', ParseUUIDPipe) id: string,
    @Body() dto: CodeReviewDto,
  ) {
    return this.service.submit(req.user!.id, id, dto);
  }
  @Get(':id') get(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(req.user!.id, id);
  }
}
