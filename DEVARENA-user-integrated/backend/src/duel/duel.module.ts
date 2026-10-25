import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { DuelGateway } from './duel.gateway';
import { DuelRoomService } from './duel-room.service';
import { DuelMatchmakingService } from './duel-matchmaking.service';

@Module({
  imports: [AuthModule, SupabaseModule],
  providers: [DuelGateway, DuelRoomService, DuelMatchmakingService],
})
export class DuelModule {}
