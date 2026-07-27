import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceToken } from '../../entities/device-token.entity';
import { RegisterDeviceDto } from '../../dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>,
  ) {}

  /**
   * Upsert par token (un même expoPushToken ne doit jamais avoir deux lignes, ex.
   * réinstallation de l'app ou reconnexion) : ré-enregistrer un token déjà connu associe
   * simplement la ligne au userId courant plutôt que de dupliquer.
   */
  async registerDevice(userId: string, dto: RegisterDeviceDto): Promise<void> {
    const existing = await this.deviceTokenRepo.findOne({ where: { expoPushToken: dto.expoPushToken } });
    if (existing) {
      existing.userId = userId;
      existing.plateforme = dto.plateforme;
      await this.deviceTokenRepo.save(existing);
      return;
    }

    await this.deviceTokenRepo.save(
      this.deviceTokenRepo.create({ userId, expoPushToken: dto.expoPushToken, plateforme: dto.plateforme }),
    );
  }

  /**
   * Sans expoPushToken précisé, retire tous les tokens de l'utilisateur (déconnexion
   * globale des notifications) ; avec, ne retire que cet appareil précis.
   */
  async unregisterDevice(userId: string, expoPushToken?: string): Promise<void> {
    if (expoPushToken) {
      await this.deviceTokenRepo.delete({ userId, expoPushToken });
      return;
    }
    await this.deviceTokenRepo.delete({ userId });
  }
}
