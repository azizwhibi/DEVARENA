import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { MessagingGateway } from './messaging.gateway';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [InvitationsController, MessagingController],
  providers: [InvitationsService, MessagingService, MessagingGateway],
  exports: [InvitationsService, MessagingService, MessagingGateway],
})
export class MessagingModule {}
