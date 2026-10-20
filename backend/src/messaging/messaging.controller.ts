import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('messaging')
@ApiBearerAuth()
@UseGuards(UserGuard)
@Controller('conversations')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get()
  async listConversations(@CurrentUser() user: AuthUser) {
    return this.messagingService.listUserConversations(user.id);
  }

  @Get(':id/messages')
  async getMessages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.messagingService.getConversationMessages(user.id, id);
  }

  @Post(':id/messages')
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.saveMessage(user.id, id, dto.content);
  }
}
