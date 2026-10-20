import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from '../auth/guards';
import { TechnologiesService } from './technologies.service';
import { CreateTechnologyDto, UpdateTechnologyDto } from './dto/technology.dto';

type AuthedRequest = Request & { user?: { id: string | null } };

@ApiTags('admin / technologies')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/technologies')
export class TechnologiesController {
  constructor(private readonly technologies: TechnologiesService) {}

  @Get()
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  list(@Query('includeInactive') includeInactive?: string) {
    return this.technologies.list(includeInactive === 'true');
  }

  @Post()
  create(@Body() dto: CreateTechnologyDto, @Req() req: AuthedRequest) {
    return this.technologies.create(dto, req.user?.id ?? null);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTechnologyDto,
    @Req() req: AuthedRequest,
  ) {
    return this.technologies.update(id, dto, req.user?.id ?? null);
  }

  @Patch(':id/deactivate')
  deactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.technologies.setActive(id, false, req.user?.id ?? null);
  }

  @Patch(':id/activate')
  activate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.technologies.setActive(id, true, req.user?.id ?? null);
  }
}
