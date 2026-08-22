import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  Param,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceDto, UnregisterDeviceDto } from '../../dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('device')
  @HttpCode(204)
  async registerDevice(
    @CurrentUser() user: any,
    @Body() dto: RegisterDeviceDto,
  ) {
    await this.notificationsService.registerDevice(user.id, dto);
  }

  @Delete('device')
  @HttpCode(204)
  async unregisterDevice(
    @CurrentUser() user: any,
    @Body() dto: UnregisterDeviceDto,
  ) {
    await this.notificationsService.unregisterDevice(
      user.id,
      dto.expoPushToken,
    );
  }

  @Get()
  async getNotifications(
    @CurrentUser() user: any,
    @Query('limit') limit: string = '50',
  ) {
    return this.notificationsService.getNotifications(
      user.id,
      parseInt(limit, 10),
    );
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationsService.getUnreadNotificationsCount(
      user.id,
    );
    return { count };
  }

  @Patch(':notificationId/read')
  async markAsRead(@Param('notificationId') notificationId: string) {
    return this.notificationsService.markAsRead(notificationId);
  }

  @Patch('mark-all-read')
  async markAllAsRead(@CurrentUser() user: any) {
    await this.notificationsService.markAllAsRead(user.id);
    return { message: 'Toutes les notifications sont marquées comme lues' };
  }

  @Delete(':notificationId')
  async deleteNotification(@Param('notificationId') notificationId: string) {
    await this.notificationsService.deleteNotification(notificationId);
    return { message: 'Notification supprimée' };
  }
}
