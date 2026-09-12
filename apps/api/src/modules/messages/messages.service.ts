import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Conversation } from '../../entities/conversation.entity';
import { Message } from '../../entities/message.entity';
import { Story } from '../../entities/story.entity';
import { User } from '../../entities/user.entity';
import {
  ConversationResponseDto,
  MessageResponseDto,
  MessageStoryPreviewDto,
  SendMessageRequestDto,
} from '../../dto';

/**
 * Messagerie privée entre deux utilisateurs. Sert deux usages : la messagerie directe
 * (écran "Messages") et les réponses à un statut/story — quand `StoryViewer.tsx` envoie
 * une réponse, elle arrive ICI comme un message privé normal avec `storyId` renseigné
 * (jamais comme un commentaire public), exactement comme sur WhatsApp/Instagram. Voir
 * API_CONTRACT.md pour le détail des routes.
 */
@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(Story)
    private storyRepo: Repository<Story>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /** Normalise la paire (user1Id < user2Id) — une seule ligne possible par paire. */
  private orderPair(aId: string, bId: string): [string, string] {
    return aId < bId ? [aId, bId] : [bId, aId];
  }

  private async findConversation(
    aId: string,
    bId: string,
  ): Promise<Conversation | null> {
    const [user1Id, user2Id] = this.orderPair(aId, bId);
    return this.conversationRepo.findOne({ where: { user1Id, user2Id } });
  }

  private async getOrCreateConversation(
    aId: string,
    bId: string,
  ): Promise<Conversation> {
    const existing = await this.findConversation(aId, bId);
    if (existing) return existing;
    const [user1Id, user2Id] = this.orderPair(aId, bId);
    return this.conversationRepo.save(
      this.conversationRepo.create({ user1Id, user2Id }),
    );
  }

  private async toStoryPreview(
    storyId: string | null,
  ): Promise<MessageStoryPreviewDto | null> {
    if (!storyId) return null;
    const story = await this.storyRepo.findOne({ where: { id: storyId } });
    if (!story) return null;
    return {
      id: story.id,
      urlMedia: story.urlMedia,
      mediaType: story.mediaType,
    };
  }

  private async toMessageDto(message: Message): Promise<MessageResponseDto> {
    return {
      id: message.id,
      idConversation: message.conversationId,
      idExpediteur: message.senderId,
      contenu: message.contenu,
      dateEnvoi: message.dateEnvoi,
      lu: message.lu,
      storyPreview: await this.toStoryPreview(message.storyId),
    };
  }

  /**
   * Envoie un message privé à `recipientId`. Si `dto.storyId` est fourni (réponse à un
   * statut depuis StoryViewer.tsx), le média doit exister ET appartenir à `recipientId` —
   * on ne permet pas de citer le statut d'un tiers dans un message adressé à quelqu'un
   * d'autre.
   */
  async sendMessage(
    senderId: string,
    recipientId: string,
    dto: SendMessageRequestDto,
  ): Promise<MessageResponseDto> {
    if (senderId === recipientId) {
      throw new BadRequestException(
        'Impossible de vous envoyer un message à vous-même',
      );
    }

    const recipient = await this.userRepo.findOne({
      where: { id: recipientId, dateSuppression: IsNull() },
    });
    if (!recipient) {
      throw new NotFoundException('Destinataire non trouvé ou supprimé');
    }

    if (dto.storyId) {
      const story = await this.storyRepo.findOne({
        where: { id: dto.storyId },
      });
      if (!story) {
        throw new NotFoundException('Statut cité non trouvé');
      }
      if (story.userId !== recipientId) {
        throw new BadRequestException(
          "Le statut cité n'appartient pas au destinataire",
        );
      }
    }

    const conversation = await this.getOrCreateConversation(
      senderId,
      recipientId,
    );

    const message = await this.messageRepo.save(
      this.messageRepo.create({
        conversationId: conversation.id,
        senderId,
        contenu: dto.contenu,
        storyId: dto.storyId ?? null,
      }),
    );

    conversation.dateDernierMessage = message.dateEnvoi;
    await this.conversationRepo.save(conversation);

    return this.toMessageDto(message);
  }

  /**
   * Historique des messages avec `peerId`. Marque comme lus (côté appelant) tous les
   * messages reçus de `peerId` — comportement standard "ouvrir la conversation = marquer
   * lu", pas d'endpoint séparé à appeler par le front. Renvoie `[]` si aucune conversation
   * n'existe encore (jamais de 404 : l'absence d'historique est un état normal).
   */
  async getMessagesWith(
    callerId: string,
    peerId: string,
  ): Promise<MessageResponseDto[]> {
    const conversation = await this.findConversation(callerId, peerId);
    if (!conversation) return [];

    await this.messageRepo.update(
      { conversationId: conversation.id, senderId: peerId, lu: false },
      { lu: true },
    );

    const messages = await this.messageRepo.find({
      where: { conversationId: conversation.id },
      order: { dateEnvoi: 'ASC' },
    });

    return Promise.all(messages.map((m) => this.toMessageDto(m)));
  }

  /** Liste des conversations de l'appelant, triées par activité la plus récente. */
  async listConversations(
    callerId: string,
  ): Promise<ConversationResponseDto[]> {
    const conversations = await this.conversationRepo
      .createQueryBuilder('c')
      .where('c.user1Id = :callerId OR c.user2Id = :callerId', { callerId })
      .orderBy('c.dateDernierMessage', 'DESC')
      .getMany();

    return Promise.all(
      conversations.map(async (conversation) => {
        const peerId =
          conversation.user1Id === callerId
            ? conversation.user2Id
            : conversation.user1Id;
        const peer = await this.userRepo.findOne({ where: { id: peerId } });

        const lastMessage = await this.messageRepo.findOne({
          where: { conversationId: conversation.id },
          order: { dateEnvoi: 'DESC' },
        });

        const nonLusCount = await this.messageRepo.count({
          where: {
            conversationId: conversation.id,
            senderId: peerId,
            lu: false,
          },
        });

        return {
          id: conversation.id,
          autreUtilisateur: {
            id: peerId,
            nomUtilisateur: peer?.nomUtilisateur ?? '—',
            urlAvatar: peer?.urlAvatar ?? null,
          },
          dernierMessage: lastMessage
            ? {
                contenu: lastMessage.contenu,
                dateEnvoi: lastMessage.dateEnvoi,
                estDeMoi: lastMessage.senderId === callerId,
                storyPreview: await this.toStoryPreview(lastMessage.storyId),
              }
            : null,
          nonLusCount,
        };
      }),
    );
  }
}
