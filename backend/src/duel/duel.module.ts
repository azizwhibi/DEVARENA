import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { DuelGateway } from './duel.gateway';
import { DuelMatchmakingService } from './duel-matchmaking.service';
import { DuelRoomService } from './duel-room.service';

@Module({
  imports: [AuthModule, SupabaseModule],
  providers: [DuelGateway, DuelMatchmakingService, DuelRoomService],
  exports: [DuelMatchmakingService, DuelRoomService],
})
export class DuelModule {}
