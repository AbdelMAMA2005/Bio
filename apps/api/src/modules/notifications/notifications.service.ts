import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { DeviceToken } from '../../entities/device-token.entity';
import {
  Notification,
  NotificationType,
} from '../../entities/notification.entity';
import { RegisterDeviceDto } from '../../dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  /**
   * Upsert par token (un même expoPushToken ne doit jamais avoir deux lignes, ex.
   * réinstallation de l'app ou reconnexion) : ré-enregistrer un token déjà connu associe
   * simplement la ligne au userId courant plutôt que de dupliquer.
   */
  async registerDevice(userId: string, dto: RegisterDeviceDto): Promise<void> {
    const existing = await this.deviceTokenRepo.findOne({
      where: { expoPushToken: dto.expoPushToken },
    });
    if (existing) {
      existing.userId = userId;
      existing.plateforme = dto.plateforme;
      await this.deviceTokenRepo.save(existing);
      return;
    }

    await this.deviceTokenRepo.save(
      this.deviceTokenRepo.create({
        userId,
        expoPushToken: dto.expoPushToken,
        plateforme: dto.plateforme,
      }),
    );
  }

  /**
   * Sans expoPushToken précisé, retire tous les tokens de l'utilisateur (déconnexion
   * globale des notifications) ; avec, ne retire que cet appareil précis.
   */
  async unregisterDevice(
    userId: string,
    expoPushToken?: string,
  ): Promise<void> {
    if (expoPushToken) {
      await this.deviceTokenRepo.delete({ userId, expoPushToken });
      return;
    }
    await this.deviceTokenRepo.delete({ userId });
  }

  /**
   * Créer une notification pour l'utilisateur
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    message: string,
    triggerUserId?: string,
  ): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId,
      type,
      message,
      triggerUserId,
    });
    return this.notificationRepo.save(notification);
  }

  /**
   * Obtenir les notifications de l'utilisateur
   */
  async getNotifications(
    userId: string,
    limit: number = 50,
  ): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { userId },
      relations: { triggerUser: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Obtenir le nombre de notifications non lues
   */
  async getUnreadNotificationsCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new Error('Notification non trouvée');
    }
    notification.isRead = true;
    return this.notificationRepo.save(notification);
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  /**
   * Supprimer une notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await this.notificationRepo.delete({ id: notificationId });
  }
}
