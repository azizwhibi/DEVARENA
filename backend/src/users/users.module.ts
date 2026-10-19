import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { UsersService } from './users.service';
import { MeProfileController } from './me-profile.controller';
import { TechnologiesController } from './technologies.controller';

@Module({
  imports: [ConfigModule, SupabaseModule, AuthModule],
  controllers: [MeProfileController, TechnologiesController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
