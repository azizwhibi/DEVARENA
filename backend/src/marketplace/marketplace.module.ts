import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminMarketplaceController } from './admin-marketplace.controller';
import { MarketplaceUserThrottlerGuard } from './marketplace-user-throttler.guard';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [MarketplaceController, AdminMarketplaceController],
  providers: [MarketplaceService, MarketplaceUserThrottlerGuard],
})
export class MarketplaceModule {}
