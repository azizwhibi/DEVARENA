import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RecruiterGuard, UserGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@ApiTags('invitations')
@ApiBearerAuth()
@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('recruiter/invitations')
  @UseGuards(RecruiterGuard)
  async createInvitation(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.createInvitation(user.id, dto);
  }

  @Get('recruiter/invitations')
  @UseGuards(RecruiterGuard)
  async listSentInvitations(@CurrentUser() user: AuthUser) {
    return this.invitationsService.listSentInvitations(user.id);
  }

  @Get('invitations')
  @UseGuards(UserGuard)
  async listReceivedInvitations(@CurrentUser() user: AuthUser) {
    return this.invitationsService.listReceivedInvitations(user.id);
  }

  @Patch('invitations/:id/accept')
  @UseGuards(UserGuard)
  async acceptInvitation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invitationsService.acceptInvitation(user.id, id);
  }

  @Patch('invitations/:id/decline')
  @UseGuards(UserGuard)
  async declineInvitation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invitationsService.declineInvitation(user.id, id);
  }
}
