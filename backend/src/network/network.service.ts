import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type CreateNetworkPostDto = {
  userId: string;
  type: string;
  title: string;
  description?: string;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  budget?: number | null;
  urgency?: string | null;
  visibility?: string;
  tags?: string[];
  expiresAt?: string;
};

type UpdateNetworkPostDto = {
  userId: string;
  type?: string;
  title?: string;
  description?: string;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  budget?: number | null;
  urgency?: string | null;
  visibility?: string;
  tags?: string[];
  expiresAt?: string;
};

@Injectable()
export class NetworkService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const now = new Date();

    return this.prisma.networkPost.findMany({
      where: {
        isActive: true,
        expiresAt: {
          gt: now,
        },
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.networkPost.findFirst({
      where: {
        id,
        isActive: true,
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Pazaryeri paylaşımı bulunamadı.');
    }

    return post;
  }

  async getPostStats(id: string) {
    const post = await this.prisma.networkPost.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Pazaryeri paylaşımı bulunamadı.');
    }

    const conversations = await this.prisma.conversation.findMany({
      where: {
        postId: id,
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        ConversationParticipant: {
          select: {
            User: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
        Message: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            body: true,
            createdAt: true,
            User: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const byTitleMap = new Map<string, number>();

    conversations.forEach((conversation) => {
      const title = conversation.title || 'EPH GÖRÜŞMESİ';
      byTitleMap.set(title, (byTitleMap.get(title) || 0) + 1);
    });

    const byTitle = Array.from(byTitleMap.entries())
      .map(([title, count]) => ({
        title,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      postId: post.id,
      postTitle: post.title,
      total: conversations.length,
      byTitle,
      latest: conversations.slice(0, 8).map((conversation) => {
        const lastMessage = conversation.Message[0];
        const participantNames = conversation.ConversationParticipant.map(
          (participant) =>
            `${participant.User.firstName} ${participant.User.lastName}`,
        );

        return {
          id: conversation.id,
          title: conversation.title,
          updatedAt: conversation.updatedAt,
          participants: participantNames,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                body: lastMessage.body,
                createdAt: lastMessage.createdAt,
                sender: {
                  id: lastMessage.User.id,
                  firstName: lastMessage.User.firstName,
                  lastName: lastMessage.User.lastName,
                  role: lastMessage.User.role,
                },
              }
            : null,
        };
      }),
    };
  }

  async update(id: string, dto: UpdateNetworkPostDto) {
    const existing = await this.prisma.networkPost.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Pazaryeri paylaşımı bulunamadı.');
    }

    if (existing.userId !== dto.userId) {
      throw new NotFoundException('Bu paylaşımı güncelleme yetkiniz yok.');
    }

    return this.prisma.networkPost.update({
      where: {
        id,
      },
      data: {
        type: dto.type ?? existing.type,
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        city: dto.city ?? existing.city,
        district: dto.district ?? existing.district,
        neighborhood: dto.neighborhood ?? existing.neighborhood,
        budget: dto.budget ?? existing.budget,
        urgency: dto.urgency ?? existing.urgency,
        visibility: (dto.visibility as any) ?? existing.visibility,
        tags: dto.tags ?? existing.tags,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : existing.expiresAt,
        updatedAt: new Date(),
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  async create(dto: CreateNetworkPostDto) {
    return this.prisma.networkPost.create({
      data: {
        id: randomUUID(),
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        description: dto.description || '',
        city: dto.city || null,
        district: dto.district || null,
        neighborhood: dto.neighborhood || null,
        budget: dto.budget || null,
        urgency: dto.urgency || 'Normal',
        visibility: (dto.visibility as any) || 'TUM_EPH',
        tags: dto.tags || [],
        expiresAt: dto.expiresAt
          ? new Date(dto.expiresAt)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        updatedAt: new Date(),
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }
}
