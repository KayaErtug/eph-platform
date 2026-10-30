import { assertNoBlockedInteraction, blockedPeerIds } from '../content-safety/block-policy';
import { TextSafetyService } from '../text-safety/text-safety.service';
import { TextSafetyField } from '../text-safety/text-safety.types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { networkPaidAccessWhere } from '../network/network-contact-policy';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly textSafetyService: TextSafetyService = new TextSafetyService(),
  ) {}

  private isSuperAdmin(userRole: Role) {
    return userRole === Role.SUPER_ADMIN;
  }

  private async ensureNetworkContactAccess(post: { id: string; userId: string } | null, userId: string, userRole: Role) {
    if (!post || post.userId === userId || this.isSuperAdmin(userRole)) return;
    const paid = await this.prisma.kontorHareketi.findFirst({ where: networkPaidAccessWhere(userId, post.id), select: { id: true } });
    if (!paid) throw new ForbiddenException('Talep sahibiyle iletişim için önce Talep Merkezi üzerinden kontörlü erişim açın.');
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
    userRole: Role,
  ) {
    if (this.isSuperAdmin(userRole)) return;
    if (this.isConversationParticipant(conversation, userId)) return;

    throw new ForbiddenException('Bu görüşmeye mesaj gönderme yetkiniz yok.');
  }

  private mapParticipant(item: any) {
    return {
      id: item.id,
      userId: item.userId,
      user: {
        id: item.User.id,
        firstName: item.User.role === Role.SUPER_ADMIN ? 'Yazılım Ekibi' : item.User.firstName,
        lastName: item.User.role === Role.SUPER_ADMIN ? null : item.User.lastName,
        email: item.User.role === Role.SUPER_ADMIN ? null : item.User.email,
        role: item.User.role,
      },
    };
  }

  private mapMessage(message: any) {
    const senderId = message.User?.id || message.senderId || message.userId;
    return {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      senderId,
      sender: {
        id: senderId,
        firstName: message.User?.role === Role.SUPER_ADMIN ? 'Yazılım Ekibi' : message.User?.firstName,
        lastName: message.User?.role === Role.SUPER_ADMIN ? null : message.User?.lastName,
        role: message.User?.role,
      },
    };
  }

  async getConversations(userId: string, userRole: Role) {
    if (!userId) return [];

    const blocked = new Set(await blockedPeerIds(this.prisma, userId));
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

    const paid = this.isSuperAdmin(userRole) ? [] : await this.prisma.kontorHareketi.findMany({ where: networkPaidAccessWhere(userId), select: { ilgiliKayitId: true } });
    const unlocked = new Set(paid.map(item => item.ilgiliKayitId));
    const visible = conversations.filter(item => !item.ConversationParticipant.some(participant => blocked.has(participant.userId))
      && (!item.NetworkPost || this.isSuperAdmin(userRole) || item.NetworkPost.userId === userId || unlocked.has(item.postId)));
    return Promise.all(
      visible.map(async (conversation) => {
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
                  notIn: [...blocked],
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
          messages: conversation.Message.filter(message => !blocked.has(message.senderId)).map((message) =>
            this.mapMessage(message),
          ),
          lastMessage: conversation.Message[0] && !blocked.has(conversation.Message[0].senderId)
            ? this.mapMessage(conversation.Message[0])
            : null,
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
    await assertNoBlockedInteraction(this.prisma, userId, conversation.ConversationParticipant.map(item => item.userId));
    await this.ensureNetworkContactAccess(conversation.NetworkPost, userId, userRole);

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

    await assertNoBlockedInteraction(this.prisma, creatorId, [body.participantId]);
    const title = body.title?.trim() || 'EPH GÖRÜŞMESİ';

    if (body.postId) {
      const post = await this.prisma.networkPost.findUnique({ where: { id: body.postId }, select: { id: true, userId: true, isActive: true, expiresAt: true } });
      if (!post || !post.isActive || post.expiresAt <= new Date()) throw new NotFoundException('Aktif talep bulunamadı.');
      if (post.userId !== creatorId && post.userId !== body.participantId) throw new ForbiddenException('Görüşme katılımcısı talep sahibi olmalıdır.');
      await this.ensureNetworkContactAccess(post, creatorId, userRole);
    }

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
    await assertNoBlockedInteraction(this.prisma, userId, conversation.ConversationParticipant.map(item => item.userId));
    await this.ensureNetworkContactAccess(conversation.NetworkPost, userId, userRole);

    const blocked = await blockedPeerIds(this.prisma, userId);
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        senderId: { notIn: blocked },
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
      clientMessageId?: string;
    },
    userId: string,
    userRole: Role,
  ) {
    const textBody = body.body?.trim();
    if (!textBody) {
      return {
        ok: false,
        message: 'Mesaj göndermek için mesaj içeriği eksik.',
      };
    }

    const conversation =
      await this.getConversationWithParticipants(conversationId);

    this.ensureCanWriteConversation(conversation, userId, userRole);
    await assertNoBlockedInteraction(this.prisma, userId, conversation.ConversationParticipant.map(item => item.userId));
    await this.ensureNetworkContactAccess(conversation.NetworkPost, userId, userRole);

    if (body.senderId && body.senderId !== userId) {
      throw new ForbiddenException(
        'Başka bir kullanıcı adına mesaj gönderemezsiniz.',
      );
    }

    // Task 9: Ağ tekrarında aynı mesaj çoğalmasın (İdempotency)
    const clientMessageId = body.clientMessageId?.trim();
    if (clientMessageId) {
      const existingMsg = await this.prisma.message.findFirst({
        where: { id: clientMessageId, conversationId },
        include: { User: true },
      });
      if (existingMsg) return this.mapMessage(existingMsg);
    }

    // Son 3 saniyede aynı kullanıcı ve aynı konuşmada birebir aynı mesaj gönderilmişse tekrar ekleme
    const recentDuplicate = await this.prisma.message.findFirst({
      where: {
        conversationId,
        senderId: userId,
        body: textBody,
        createdAt: { gt: new Date(Date.now() - 3000) },
      },
      include: { User: true },
    });
    if (recentDuplicate) return this.mapMessage(recentDuplicate);

    if (textBody.length > 10000) throw new BadRequestException('Mesaj en fazla 10.000 karakter olabilir.');
    const safety = this.textSafetyService.validate(textBody, { field: TextSafetyField.MESSAGE });
    if (!safety.valid) throw new BadRequestException({ code: 'UNSAFE_MESSAGE', message: safety.errors[0]?.message || 'Mesaj içeriğini düzenleyin.' });

    const messageId = clientMessageId && /^[A-Za-z0-9_-]{12,120}$/.test(clientMessageId)
      ? clientMessageId
      : randomUUID();

    const message = await this.prisma.message.create({
      data: {
        id: messageId,
        body: textBody,
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

    // Task 19: Çoklu üyelik nedeniyle tekil bildirim gönderimi
    const receiverIds = Array.from(new Set(
      message.Conversation.ConversationParticipant
        .filter((item) => item.userId !== userId)
        .map((item) => item.userId)
    ));

    await Promise.all(
      receiverIds.map((receiverId) =>
        this.notifications.notify(receiverId, {
          type: 'NEW_MESSAGE', priority: 'ONEMLI', eventKey: `message:${message.id}:${receiverId}`,
          title: 'Yeni mesajınız var',
          body: message.User.role === Role.SUPER_ADMIN ? 'Yazılım Ekibi size mesaj gönderdi.' : `${message.User.firstName} ${message.User.lastName} size mesaj gönderdi.`,
          actionUrl: `/messages/${conversationId}`,
        }).catch(() => undefined), // The committed Message is retried by NotificationEventsService.
      ),
    );

    return this.mapMessage(message);
  }

  // Task 19: Takımlara dahili mesaj
  async startTeamConversation(userId: string, officeId: string, teamId: string, customTitle?: string) {
    const office = await this.prisma.office.findUnique({
      where: { id: officeId },
      select: { id: true, ownerUserId: true, name: true, isActive: true },
    });
    if (!office || !office.isActive) throw new NotFoundException('Aktif ofis bulunamadı.');

    const isOwner = office.ownerUserId === userId;
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: { where: { isActive: true }, select: { userId: true } },
      },
    });
    if (!team || team.officeId !== officeId || !team.isActive) throw new NotFoundException('Takım bulunamadı.');

    if (!isOwner && team.leaderId !== userId) {
      throw new ForbiddenException('Yalnızca ofis sahibi veya takım lideri takıma toplu mesaj başlatabilir.');
    }

    const title = customTitle?.trim() || `[Takım] ${team.name}`;
    const allParticipantIds = Array.from(new Set([
      userId,
      ...(office.ownerUserId ? [office.ownerUserId] : []),
      ...team.members.map((m) => m.userId),
    ]));

    const existing = await this.prisma.conversation.findFirst({
      where: {
        title,
        ConversationParticipant: {
          some: { userId },
        },
      },
      include: {
        ConversationParticipant: true,
      },
    });

    if (existing) {
      const existingUserIds = new Set(existing.ConversationParticipant.map(p => p.userId));
      const missingIds = allParticipantIds.filter(id => !existingUserIds.has(id));
      if (missingIds.length > 0) {
        await this.prisma.conversationParticipant.createMany({
          data: missingIds.map(uid => ({ id: randomUUID(), conversationId: existing.id, userId: uid })),
        });
      }
      return { ok: true, conversation: existing };
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        id: randomUUID(),
        title,
        updatedAt: new Date(),
        ConversationParticipant: {
          create: allParticipantIds.map((uid) => ({
            id: randomUUID(),
            userId: uid,
          })),
        },
      },
      include: {
        ConversationParticipant: true,
      },
    });

    return { ok: true, conversation };
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
    await assertNoBlockedInteraction(this.prisma, userId, conversation.ConversationParticipant.map(item => item.userId));

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
