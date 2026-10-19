import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthService } from './auth.service';
import { AdminGuard, OptionalAuthGuard, UserGuard } from './guards';
import { MeController } from './me.controller';
import { AccountService } from './account.service';
import { AdminPingController } from './admin-ping.controller';

@Module({
  imports: [ConfigModule, SupabaseModule],
  controllers: [MeController, AdminPingController],
  providers: [
    AuthService,
    AccountService,
    UserGuard,
    AdminGuard,
    OptionalAuthGuard,
  ],
  exports: [
    AuthService,
    AccountService,
    UserGuard,
    AdminGuard,
    OptionalAuthGuard,
  ],
})
export class AuthModule {}
