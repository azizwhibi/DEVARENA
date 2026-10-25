import { MarketplaceModule } from './marketplace/marketplace.module';
import { DuelModule } from './duel/duel.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SkillsModule } from './skills/skills.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CommunityModule } from './community/community.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    SupabaseModule,
    AuthModule,
    UsersModule,
    CommunityModule,
    EventEmitterModule.forRoot(),
    SkillsModule,
    KnowledgeModule,
    MarketplaceModule,
    DuelModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
