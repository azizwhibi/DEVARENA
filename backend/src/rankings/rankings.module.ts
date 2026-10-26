import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { RankingsController } from './rankings.controller';
import { RankingsService } from './rankings.service';
import { RankRewardListener } from './rank-reward.listener';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [RankingsController],
  providers: [RankingsService, RankRewardListener],
  exports: [RankingsService, RankRewardListener],
})
export class RankingsModule {}
