import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  private isSuperAdmin(userRole: Role) {
    return userRole === Role.SUPER_ADMIN;
  }

  private async getConversationWithParticipants(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        NetworkPost: true,
        ConversationParticipant: {
          include: {
            User: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Görüşme bulunamadı.');
    }

    return conversation;
  }

  private isConversationParticipant(
    conversation: {
      ConversationParticipant: Array<{
        userId: string;
      }>;
    },
    userId: string,
  ) {
    return conversation.ConversationParticipant.some(
      (participant) => participant.userId === userId,
    );
  }

  private ensureCanReadConversation(
    conversation: {
      ConversationParticipant: Array<{
        userId: string;
      }>;
    },
    userId: string,
    userRole: Role,
  ) {
    if (this.isSuperAdmin(userRole)) return;

    if (this.isConversationParticipant(conversation, userId)) return;

    throw new ForbiddenException('Bu görüşmeye erişim yetkiniz yok.');
  }

  private ensureCanWriteConversation(
    conversation: {
      ConversationParticipant: Array<{
        userId: string;
      }>;
    },
    userId: string,
  ) {
    if (this.isConversationParticipant(conversation, userId)) return;

    throw new ForbiddenException('Bu görüşmeye mesaj gönderme yetkiniz yok.');
  }

  private mapParticipant(item: any) {
    return {
      id: item.id,
      userId: item.userId,
      user: {
        id: item.User.id,
        firstName: item.User.firstName,
        lastName: item.User.lastName,
        email: item.User.email,
        role: item.User.role,
      },
    };
  }

  private mapMessage(message: any) {
    return {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      sender: {
        id: message.User.id,
        firstName: message.User.firstName,
        lastName: message.User.lastName,
        role: message.User.role,
      },
    };
  }

  async getConversations(userId: string, userRole: Role) {
    if (!userId) return [];

    const conversations = await this.prisma.conversation.findMany({
      where: this.isSuperAdmin(userRole)
        ? {}
        : {
            ConversationParticipant: {
              some: {
                userId,
              },
            },
          },
      include: {
        NetworkPost: true,
        ConversationParticipant: {
          include: {
            User: true,
          },
        },
        Message: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            User: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return Promise.all(
      conversations.map(async (conversation) => {
        const myParticipant = conversation.ConversationParticipant.find(
          (item) => item.userId === userId,
        );

        const unreadCount = this.isSuperAdmin(userRole)
          ? 0
          : await this.prisma.message.count({
              where: {
                conversationId: conversation.id,
                senderId: {
                  not: userId,
                },
                createdAt: {
                  gt: myParticipant?.lastReadAt || new Date(0),
                },
              },
            });

        return {
          id: conversation.id,
          title: conversation.title,
          status: conversation.status,
          postId: conversation.postId,
          post: conversation.NetworkPost,
          participants: conversation.ConversationParticipant.map((item) =>
            this.mapParticipant(item),
          ),
          messages: conversation.Message.map((message) =>
            this.mapMessage(message),
          ),
          unreadCount,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        };
      }),
    );
  }

  async getConversation(conversationId: string, userId: string, userRole: Role) {
    const conversation =
      await this.getConversationWithParticipants(conversationId);

    this.ensureCanReadConversation(conversation, userId, userRole);

    return {
      id: conversation.id,
      title: conversation.title,
      status: conversation.status,
      postId: conversation.postId,
      post: conversation.NetworkPost,
      participants: conversation.ConversationParticipant.map((item) =>
        this.mapParticipant(item),
      ),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  async startConversation(
    body: {
      postId?: string;
      title?: string;
      creatorId?: string;
      participantId?: string;
    },
    userId: string,
    userRole: Role,
  ) {
    if (!body.participantId) {
      return {
        ok: false,
        message: 'Görüşme başlatmak için karşı kullanıcı bilgisi eksik.',
      };
    }

    const creatorId = body.creatorId || userId;

    if (!this.isSuperAdmin(userRole) && creatorId !== userId) {
      throw new ForbiddenException(
        'Başka bir kullanıcı adına görüşme başlatamazsınız.',
      );
    }

    if (creatorId === body.participantId) {
      return {
        ok: false,
        message: 'Kendinizle görüşme başlatmanıza gerek yok.',
      };
    }

    const title = body.title?.trim() || 'EPH GÖRÜŞMESİ';

    const existing = await this.prisma.conversation.findFirst({
      where: {
        postId: body.postId || null,
        title,
        ConversationParticipant: {
          every: {
            userId: {
              in: [creatorId, body.participantId],
            },
          },
        },
      },
      include: {
        ConversationParticipant: true,
      },
    });

    if (existing && existing.ConversationParticipant.length === 2) {
      return existing;
    }

    return this.prisma.conversation.create({
      data: {
        id: randomUUID(),
        postId: body.postId || null,
        title,
        updatedAt: new Date(),
        ConversationParticipant: {
          create: [
            {
              id: randomUUID(),
              userId: creatorId,
            },
            {
              id: randomUUID(),
              userId: body.participantId,
            },
          ],
        },
      },
    });
  }

  async getMessages(conversationId: string, userId: string, userRole: Role) {
    const conversation =
      await this.getConversationWithParticipants(conversationId);

    this.ensureCanReadConversation(conversation, userId, userRole);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        User: true,
      },
    });

    return messages.map((message) => this.mapMessage(message));
  }

  async sendMessage(
    conversationId: string,
    body: {
      senderId?: string;
      body: string;
    },
    userId: string,
    userRole: Role,
  ) {
    if (!body.body?.trim()) {
      return {
        ok: false,
        message: 'Mesaj göndermek için mesaj içeriği eksik.',
      };
    }

    const conversation =
      await this.getConversationWithParticipants(conversationId);

    this.ensureCanWriteConversation(conversation, userId);

    if (body.senderId && body.senderId !== userId) {
      throw new ForbiddenException(
        'Başka bir kullanıcı adına mesaj gönderemezsiniz.',
      );
    }

    if (this.isSuperAdmin(userRole) && !this.isConversationParticipant(conversation, userId)) {
      throw new ForbiddenException(
        'Super Admin görüşmeleri inceleyebilir fakat taraf olmadığı görüşmeye mesaj gönderemez.',
      );
    }

    const message = await this.prisma.message.create({
      data: {
        id: randomUUID(),
        body: body.body.trim(),
        Conversation: {
          connect: {
            id: conversationId,
          },
        },
        User: {
          connect: {
            id: userId,
          },
        },
      },
      include: {
        User: true,
        Conversation: {
          include: {
            ConversationParticipant: true,
          },
        },
      },
    });

    await this.prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    const receiverIds = message.Conversation.ConversationParticipant
      .filter((item) => item.userId !== userId)
      .map((item) => item.userId);

    await Promise.all(
      receiverIds.map((receiverId) =>
        this.pushService.sendToUser(receiverId, {
          title: 'Yeni mesajınız var',
          body: `${message.User.firstName} ${message.User.lastName} size mesaj gönderdi.`,
          url: `/messages/${conversationId}`,
        }),
      ),
    );

    return this.mapMessage(message);
  }

  async markAsRead(conversationId: string, userId: string, userRole: Role) {
    if (!conversationId || !userId) {
      return {
        ok: false,
        message: 'Okundu bilgisi için kullanıcı veya görüşme eksik.',
      };
    }

    const conversation =
      await this.getConversationWithParticipants(conversationId);

    this.ensureCanReadConversation(conversation, userId, userRole);

    if (this.isSuperAdmin(userRole) && !this.isConversationParticipant(conversation, userId)) {
      return {
        ok: true,
      };
    }

    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return {
      ok: true,
    };
  }
}