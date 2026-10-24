import {
  Controller,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserGuard } from '../auth/guards';
import { CatalogService } from './catalog.service';
import { CatalogQueryDto } from './dto/catalog-query.dto';

@ApiTags('skills')
@ApiBearerAuth()
@UseGuards(UserGuard)
@Controller('skills')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(@Query() query: CatalogQueryDto) {
    return this.catalog.list(query);
  }
  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.detail(id);
  }
}
