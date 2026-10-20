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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards';
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { ListSkillsDto } from './dto/list-skills.dto';

@ApiTags('admin / skills')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/skills')
export class SkillsController {
  constructor(private readonly skills: SkillsService) {}

  @Get('meta')
  meta() {
    return this.skills.meta();
  }

  @Get()
  list(@Query() query: ListSkillsDto) {
    return this.skills.list(query);
  }

  @Post()
  create(@Body() dto: CreateSkillDto, @Req() req: any) {
    return this.skills.create(dto, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSkillDto,
    @Req() req: any,
  ) {
    return this.skills.update(id, dto, req.user.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.skills.setActive(id, false, req.user.id);
  }

  @Patch(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.skills.setActive(id, true, req.user.id);
  }
}
