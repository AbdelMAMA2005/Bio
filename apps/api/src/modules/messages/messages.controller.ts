import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageRequestDto } from '../../dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // ----- Liste des conversations de l'appelant -----
  @Get('conversations')
  async listConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.messagesService.listConversations(user.id);
  }

  // ----- Historique des messages avec un utilisateur (marque les messages reçus comme lus) -----
  @Get('with/:userId')
  async getMessagesWith(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') peerId: string,
  ) {
    return this.messagesService.getMessagesWith(user.id, peerId);
  }

  // ----- Envoyer un message privé à un utilisateur (avec citation de statut optionnelle) -----
  @Post('with/:userId')
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') recipientId: string,
    @Body() dto: SendMessageRequestDto,
  ) {
    return this.messagesService.sendMessage(user.id, recipientId, dto);
  }
}
