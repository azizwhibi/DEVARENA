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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

type AuthedRequest = Request & { user?: { id: string | null } };

@ApiTags('admin / skill-categories')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/skill-categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  list(@Query('includeInactive') includeInactive?: string) {
    return this.categories.list(includeInactive === 'true');
  }

  @Post()
  create(@Body() dto: CreateCategoryDto, @Req() req: AuthedRequest) {
    return this.categories.create(dto, req.user?.id ?? null);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: AuthedRequest,
  ) {
    return this.categories.update(id, dto, req.user?.id ?? null);
  }

  @Patch(':id/deactivate')
  deactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.categories.setActive(id, false, req.user?.id ?? null);
  }

  @Patch(':id/activate')
  activate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.categories.setActive(id, true, req.user?.id ?? null);
  }
}
