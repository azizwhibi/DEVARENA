import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards';
import { SupabaseService } from './skills-database.service';

@ApiTags('admin / skill challenges')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/skill-challenges')
export class SkillsDirectoryController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async list() {
    const { data, error } = await this.supabase.client
      .from('challenges')
      .select('id,title')
      .order('title');
    if (error) throw error;
    return data ?? [];
  }
}
