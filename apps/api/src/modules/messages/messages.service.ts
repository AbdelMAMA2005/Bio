import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
  ): Promise<Message> {
    // Vérifier que le destinataire existe
    const receiver = await this.userRepository.findOne({
      where: { id: receiverId, dateSuppression: IsNull() },
    });

    if (!receiver) {
      throw new NotFoundException('Destinataire non trouvé');
    }

    const message = this.messageRepository.create({
      senderId,
      receiverId,
      content,
    });

    return this.messageRepository.save(message);
  }

  async getConversation(
    userId: string,
    otherUserId: string,
    limit: number = 50,
  ): Promise<Message[]> {
    return this.messageRepository.find({
      where: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getConversations(userId: string): Promise<any[]> {
    const messages = await this.messageRepository.find({
      where: [{ senderId: userId }, { receiverId: userId }],
      relations: { sender: true, receiver: true },
      order: { createdAt: 'DESC' },
    });

    // Group by conversation (distinct other user)
    const conversations = new Map();
    messages.forEach((msg) => {
      const otherUserId =
        msg.senderId === userId ? msg.receiverId : msg.senderId;
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;

      if (!conversations.has(otherUserId)) {
        conversations.set(otherUserId, {
          otherUser: {
            id: otherUser.id,
            username: otherUser.username ?? '',
            fullName: otherUser.fullName,
            urlAvatar: otherUser.urlAvatar,
          },
          lastMessage: msg.content,
          lastMessageDate: msg.createdAt,
          unreadCount: msg.receiverId === userId && !msg.isRead ? 1 : 0,
        });
      } else {
        const conv = conversations.get(otherUserId);
        if (msg.receiverId === userId && !msg.isRead) {
          conv.unreadCount += 1;
        }
      }
    });

    return Array.from(conversations.values());
  }

  async markAsRead(messageId: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    message.isRead = true;
    return this.messageRepository.save(message);
  }

  async markConversationAsRead(
    userId: string,
    otherUserId: string,
  ): Promise<void> {
    await this.messageRepository.update(
      { receiverId: userId, senderId: otherUserId, isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.messageRepository.count({
      where: { receiverId: userId, isRead: false },
    });
  }
}
