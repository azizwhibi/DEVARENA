import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { CommunityController } from './community.controller';
import { AdminCommunityController } from './admin-community.controller';
import { CommunityService } from './community.service';
import { CommunityAdminService } from './community-admin.service';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [CommunityController, AdminCommunityController],
  providers: [CommunityService, CommunityAdminService],
  exports: [CommunityService, CommunityAdminService],
})
export class CommunityModule {}
