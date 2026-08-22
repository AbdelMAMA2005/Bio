import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  UseGuards,
  Body,
  Query,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async sendMessage(
    @CurrentUser() currentUser: any,
    @Body() body: { receiverId: string; content: string },
  ) {
    return this.messagesService.sendMessage(
      currentUser.id,
      body.receiverId,
      body.content,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations')
  async getConversations(@CurrentUser() currentUser: any) {
    return this.messagesService.getConversations(currentUser.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() currentUser: any) {
    const count = await this.messagesService.getUnreadCount(currentUser.id);
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':otherUserId')
  async getConversation(
    @CurrentUser() currentUser: any,
    @Param('otherUserId') otherUserId: string,
    @Query('limit') limit: string = '50',
  ) {
    return this.messagesService.getConversation(
      currentUser.id,
      otherUserId,
      parseInt(limit, 10),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':messageId/read')
  async markAsRead(@Param('messageId') messageId: string) {
    return this.messagesService.markAsRead(messageId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':otherUserId/mark-read')
  async markConversationAsRead(
    @CurrentUser() currentUser: any,
    @Param('otherUserId') otherUserId: string,
  ) {
    await this.messagesService.markConversationAsRead(
      currentUser.id,
      otherUserId,
    );
    return { message: 'Conversation marquée comme lue' };
  }
}
