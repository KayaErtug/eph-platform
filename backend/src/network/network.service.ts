import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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


type NetworkPostChangeItem = {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
};

function normalizeValue(value: unknown) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(',');
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function valuesChanged(oldValue: unknown, newValue: unknown) {
  return normalizeValue(oldValue) !== normalizeValue(newValue);
}

function summarizeChanges(changes: NetworkPostChangeItem[]) {
  const labels = changes.map((change) => change.label);

  if (labels.includes('Bütçe')) return 'Bu ilanda fiyat değişti.';
  if (labels.includes('Açıklama')) return 'Bu ilanda açıklama değişti.';
  if (
    labels.includes('İl') ||
    labels.includes('İlçe') ||
    labels.includes('Mahalle')
  ) {
    return 'Bu ilanda lokasyon değişti.';
  }

  return `Bu ilanda ${labels.join(', ')} değişti.`;
}

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

    const followerCount = await this.prisma.networkPostFollower.count({
      where: {
        postId: id,
      },
    });

    return {
      postId: post.id,
      postTitle: post.title,
      total: conversations.length,
      followerCount,
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

  async getUpdateLogs(id: string) {
    const logs = await this.prisma.networkPostUpdateLog.findMany({
      where: {
        postId: id,
      },
      include: {
        user: {
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

    return logs.map((log) => {
      const rawChanges = log.changes as any;
      const normalizedChanges = Array.isArray(rawChanges)
        ? rawChanges
        : Array.isArray(rawChanges?.items)
          ? rawChanges.items
          : [];

      return {
        id: log.id,
        summary: log.summary,
        changes: normalizedChanges,
        createdAt: log.createdAt,
        user: log.user,
      };
    });
  }


  async getFollowStatus(id: string, userId?: string) {
    const post = await this.prisma.networkPost.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Pazaryeri paylaşımı bulunamadı.');
    }

    const followerCount = await this.prisma.networkPostFollower.count({
      where: {
        postId: id,
      },
    });

    if (!userId) {
      return {
        postId: id,
        isFollowing: false,
        followerCount,
      };
    }

    const existing = await this.prisma.networkPostFollower.findUnique({
      where: {
        postId_userId: {
          postId: id,
          userId,
        },
      },
    });

    return {
      postId: id,
      isFollowing: Boolean(existing),
      followerCount,
    };
  }

  async followPost(id: string, userId: string) {
    if (!userId) {
      return {
        ok: false,
        message: 'Takip işlemi için kullanıcı bilgisi eksik.',
      };
    }

    const post = await this.prisma.networkPost.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Pazaryeri paylaşımı bulunamadı.');
    }

    if (post.userId === userId) {
      return {
        ok: false,
        message: 'Kendi paylaşımınızı takip etmenize gerek yok.',
      };
    }

    await this.prisma.networkPostFollower.upsert({
      where: {
        postId_userId: {
          postId: id,
          userId,
        },
      },
      update: {},
      create: {
        postId: id,
        userId,
      },
    });

    return this.getFollowStatus(id, userId);
  }

  async unfollowPost(id: string, userId: string) {
    if (!userId) {
      return {
        ok: false,
        message: 'Takipten çıkmak için kullanıcı bilgisi eksik.',
      };
    }

    await this.prisma.networkPostFollower.deleteMany({
      where: {
        postId: id,
        userId,
      },
    });

    return this.getFollowStatus(id, userId);
  }

  async getFollowedPosts(userId: string) {
    if (!userId) return [];

    const follows = await this.prisma.networkPostFollower.findMany({
      where: {
        userId,
        post: {
          isActive: true,
          expiresAt: {
            gt: new Date(),
          },
        },
      },
      include: {
        post: {
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
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return follows.map((follow) => ({
      id: follow.id,
      followedAt: follow.createdAt,
      post: follow.post,
    }));
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

    const nextData = {
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
    };

    const changes: NetworkPostChangeItem[] = [];

    const watchedFields: Array<{
      field: keyof typeof nextData;
      label: string;
    }> = [
      { field: 'type', label: 'Paylaşım tipi' },
      { field: 'title', label: 'Başlık' },
      { field: 'description', label: 'Açıklama' },
      { field: 'city', label: 'İl' },
      { field: 'district', label: 'İlçe' },
      { field: 'neighborhood', label: 'Mahalle' },
      { field: 'budget', label: 'Bütçe' },
      { field: 'urgency', label: 'Aciliyet' },
      { field: 'visibility', label: 'Görünürlük' },
      { field: 'tags', label: 'Etiketler' },
      { field: 'expiresAt', label: 'Geçerlilik tarihi' },
    ];

    watchedFields.forEach((item) => {
      const oldValue = existing[item.field as keyof typeof existing];
      const newValue = nextData[item.field];

      if (valuesChanged(oldValue, newValue)) {
        changes.push({
          field: item.field,
          label: item.label,
          oldValue,
          newValue,
        });
      }
    });

    const updatedPost = await this.prisma.networkPost.update({
      where: {
        id,
      },
      data: {
        ...nextData,
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

    if (changes.length > 0) {
      await this.prisma.networkPostUpdateLog.create({
        data: {
          postId: id,
          userId: dto.userId,
          summary: summarizeChanges(changes),
          changes: {
            items: changes.map((change) => ({
              field: change.field,
              label: change.label,
              oldValue: change.oldValue,
              newValue: change.newValue,
            })),
          } as Prisma.InputJsonValue,
        },
      });
    }

    return updatedPost;
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
