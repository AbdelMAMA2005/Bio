import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Follower } from '../../entities/follower.entity';
import { User } from '../../entities/user.entity';
import { ConnectionCircle } from '../../entities/enums/connection-circle.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';

@Injectable()
export class FollowerService {
  constructor(
    @InjectRepository(Follower)
    private followerRepository: Repository<Follower>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  async followUser(followerId: string, followingId: string): Promise<Follower> {
    if (followerId === followingId) {
      throw new ConflictException('Vous ne pouvez pas vous suivre vous-même');
    }

    // Vérifier que les deux utilisateurs existent
    const follower = await this.userRepository.findOne({
      where: { id: followerId, dateSuppression: IsNull() },
    });
    const following = await this.userRepository.findOne({
      where: { id: followingId, dateSuppression: IsNull() },
    });

    if (!follower || !following) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Vérifier si le suivi existe déjà
    const existing = await this.followerRepository.findOne({
      where: { followerId, followingId },
    });
    if (existing) {
      throw new ConflictException('Vous suivez déjà cet utilisateur');
    }

    const follow = this.followerRepository.create({
      followerId,
      followingId,
      isApproved: following.isPublicProfile, // Auto-approved if profile is public
    });

    const saved = await this.followerRepository.save(follow);
    
    // Créer une notification FOLLOW
    await this.notificationsService.createNotification(
      followingId,
      NotificationType.FOLLOW,
      `${follower.username || follower.fullName} vous suit maintenant`,
      followerId,
    );

    return saved;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await this.followerRepository.delete({ followerId, followingId });
  }

  async getFollowers(userId: string): Promise<Follower[]> {
    return this.followerRepository.find({
      where: { followingId: userId, isApproved: true },
      relations: { follower: true },
    });
  }

  async getFollowing(userId: string): Promise<Follower[]> {
    return this.followerRepository.find({
      where: { followerId: userId, isApproved: true },
      relations: { following: true },
    });
  }

  async getFollowersCount(userId: string): Promise<number> {
    return this.followerRepository.count({
      where: { followingId: userId, isApproved: true },
    });
  }

  async getFollowingCount(userId: string): Promise<number> {
    return this.followerRepository.count({
      where: { followerId: userId, isApproved: true },
    });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.followerRepository.findOne({
      where: { followerId, followingId, isApproved: true },
    });
    return !!follow;
  }

  async setCircle(
    followerId: string,
    followingId: string,
    circle: ConnectionCircle,
  ): Promise<Follower> {
    const connection = await this.followerRepository.findOne({ where: { followerId, followingId } });
    if (!connection) throw new NotFoundException('Connexion non trouvée');
    connection.circle = circle;
    return this.followerRepository.save(connection);
  }

  async getCircle(viewerId: string, authorId: string): Promise<ConnectionCircle | null> {
    if (viewerId === authorId) return ConnectionCircle.CLOSE_FRIENDS;
    const connection = await this.followerRepository.findOne({
      where: { followerId: viewerId, followingId: authorId, isApproved: true },
    });
    return connection?.circle ?? null;
  }

  async approveFollowRequest(
    followerId: string,
    followingId: string,
  ): Promise<Follower> {
    const follow = await this.followerRepository.findOne({
      where: { followerId, followingId },
    });

    if (!follow) {
      throw new NotFoundException('Demande de suivi non trouvée');
    }

    follow.isApproved = true;
    return this.followerRepository.save(follow);
  }
}
