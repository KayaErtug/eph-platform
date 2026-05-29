import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  async getConversations(userId: string) {
    if (!userId) return [];

    const conversations = await this.prisma.conversation.findMany({
      where: {
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

        const unreadCount = await this.prisma.message.count({
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
          participants: conversation.ConversationParticipant.map((item) => ({
            id: item.id,
            userId: item.userId,
            user: {
              id: item.User.id,
              firstName: item.User.firstName,
              lastName: item.User.lastName,
              email: item.User.email,
              role: item.User.role,
            },
          })),
          messages: conversation.Message.map((message) => ({
            id: message.id,
            body: message.body,
            createdAt: message.createdAt,
            sender: {
              id: message.User.id,
              firstName: message.User.firstName,
              lastName: message.User.lastName,
              role: message.User.role,
            },
          })),
          unreadCount,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        };
      }),
    );
  }

  async getConversation(conversationId: string) {
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
      return {
        ok: false,
        message: 'Görüşme bulunamadı.',
      };
    }

    return {
      id: conversation.id,
      title: conversation.title,
      status: conversation.status,
      postId: conversation.postId,
      post: conversation.NetworkPost,
      participants: conversation.ConversationParticipant.map((item) => ({
        id: item.id,
        userId: item.userId,
        user: {
          id: item.User.id,
          firstName: item.User.firstName,
          lastName: item.User.lastName,
          email: item.User.email,
          role: item.User.role,
        },
      })),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  async startConversation(body: {
    postId?: string;
    title?: string;
    creatorId?: string;
    participantId?: string;
  }) {
    if (!body.creatorId || !body.participantId) {
      return {
        ok: false,
        message: 'Görüşme başlatmak için kullanıcı bilgisi eksik.',
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
              in: [body.creatorId, body.participantId],
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
              userId: body.creatorId,
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

  async getMessages(conversationId: string) {
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

    return messages.map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      sender: {
        id: message.User.id,
        firstName: message.User.firstName,
        lastName: message.User.lastName,
        role: message.User.role,
      },
    }));
  }

  async sendMessage(
    conversationId: string,
    body: {
      senderId: string;
      body: string;
    },
  ) {
    if (!body.senderId || !body.body?.trim()) {
      return {
        ok: false,
        message: 'Mesaj göndermek için gerekli bilgiler eksik.',
      };
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
            id: body.senderId,
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
      .filter((item) => item.userId !== body.senderId)
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

  async markAsRead(conversationId: string, userId: string) {
    if (!conversationId || !userId) {
      return {
        ok: false,
        message: 'Okundu bilgisi için kullanıcı veya görüşme eksik.',
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
