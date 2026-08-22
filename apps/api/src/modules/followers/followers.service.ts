import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Follower } from '../../entities/follower.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class FollowerService {
  constructor(
    @InjectRepository(Follower)
    private followerRepository: Repository<Follower>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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

    return this.followerRepository.save(follow);
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
