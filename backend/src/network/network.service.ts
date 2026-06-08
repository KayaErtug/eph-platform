import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

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


const MAX_FORUM_DESCRIPTION_LENGTH = 600;

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

function formatNotificationValue(value: unknown) {
  if (value == null || value === '') return 'Boş';
  if (Array.isArray(value)) return value.join(', ') || 'Boş';

  if (value instanceof Date) {
    return value.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  if (typeof value === 'number') {
    return `${value.toLocaleString('tr-TR')} TL`;
  }

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    return new Date(text).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  return text;
}

function buildNotificationMessage(changes: NetworkPostChangeItem[]) {
  const important = changes.slice(0, 4);

  if (important.length === 0) {
    return 'Takip ettiğiniz ilanda güncelleme yapıldı.';
  }

  const lines = important.map((change) => {
    return `${change.label}: ${formatNotificationValue(change.oldValue)} → ${formatNotificationValue(change.newValue)}`;
  });

  return `Takip ettiğiniz ilanda güncelleme yapıldı.\n\n${lines.join('\n')}`;
}


const FORUM_CATEGORY_LABELS: Record<string, string> = {
  PORTFOY_ARIYORUM: 'Portföy Arıyorum',
  BOLGE_ORTAGI_ARIYORUM: 'Bölge Ortağı Arıyorum',
  PORTFOY_ORTAGI_ARIYORUM: 'Portföy Ortağı Arıyorum',
  SATIS_OFISI_ARIYORUM: 'Satış Ofisi Arıyorum',
  KAMPANYA_DUYURULARI: 'Kampanya Duyuruları',
  KAT_KARSILIGI_ARSA_ARIYORUM: 'Kat Karşılığı Arsa Arıyorum',
  MUTEAHHIT_YUKLENICI_ARIYORUM: 'Müteahhit / Yüklenici Arıyorum',
  ULUSAL_BOLGESEL_SATIS_PARTNERI_ARIYORUM: 'Ulusal/Bölgesel Satış Partneri Arıyorum',
  YATIRIMCI_ARIYORUM: 'Yatırımcı Arıyorum',
  PLATFORM_DUYURUSU: 'Platform Duyurusu',
  SISTEM_GUNCELLEMESI: 'Sistem Güncellemesi',
  EGITIM_BILGILENDIRME: 'Eğitim / Bilgilendirme',
  SEKTOREL_SORU: 'Sektörel Soru',
  DIGER: 'Diğer',
};

const ROLE_FORUM_CATEGORIES: Record<string, string[]> = {
  EMLAKCI: ['PORTFOY_ARIYORUM', 'BOLGE_ORTAGI_ARIYORUM', 'PORTFOY_ORTAGI_ARIYORUM', 'SEKTOREL_SORU', 'DIGER'],
  MUTEAHHIT: ['SATIS_OFISI_ARIYORUM', 'KAMPANYA_DUYURULARI', 'KAT_KARSILIGI_ARSA_ARIYORUM', 'SEKTOREL_SORU', 'DIGER'],
  INSAAT_FIRMASI: ['KAT_KARSILIGI_ARSA_ARIYORUM', 'MUTEAHHIT_YUKLENICI_ARIYORUM', 'ULUSAL_BOLGESEL_SATIS_PARTNERI_ARIYORUM', 'KAMPANYA_DUYURULARI', 'YATIRIMCI_ARIYORUM', 'SEKTOREL_SORU', 'DIGER'],
  ADMIN: ['PLATFORM_DUYURUSU', 'SISTEM_GUNCELLEMESI', 'EGITIM_BILGILENDIRME', 'SEKTOREL_SORU'],
  SUPER_ADMIN: ['PLATFORM_DUYURUSU', 'SISTEM_GUNCELLEMESI', 'EGITIM_BILGILENDIRME', 'SEKTOREL_SORU'],
};

function normalizeRoleName(role?: string | null) {
  return String(role || '').trim().toUpperCase();
}

function normalizeForumCategory(value?: string | null) {
  const raw = String(value || '').trim();
  const upper = raw.toUpperCase();

  if (FORUM_CATEGORY_LABELS[upper]) return upper;

  const labelMatch = Object.entries(FORUM_CATEGORY_LABELS).find(([, label]) => {
    return label.toLocaleLowerCase('tr-TR') === raw.toLocaleLowerCase('tr-TR');
  });

  if (labelMatch) return labelMatch[0];

  return '';
}

function requiresForumCity(category: string) {
  return !['PLATFORM_DUYURUSU', 'SISTEM_GUNCELLEMESI', 'EGITIM_BILGILENDIRME', 'SEKTOREL_SORU'].includes(category);
}

function requiresForumProperty(category: string) {
  return ['PORTFOY_ARIYORUM', 'PORTFOY_ORTAGI_ARIYORUM', 'KAT_KARSILIGI_ARSA_ARIYORUM'].includes(category);
}

function cleanForumText(value?: string | null) {
  return String(value || '').trim();
}

@Injectable()
export class NetworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  private async validateForumPostInput(dto: CreateNetworkPostDto | UpdateNetworkPostDto, mode: 'create' | 'update') {
    const userId = cleanForumText(dto.userId);

    if (!userId) {
      throw new BadRequestException('Kullanıcı bilgisi olmadan forum talebi oluşturulamaz.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new BadRequestException('Forum talebi için kullanıcı bulunamadı.');
    }

    const category = normalizeForumCategory(dto.type);

    if (!category) {
      throw new BadRequestException('Lütfen talep kategorisini seçin.');
    }

    const allowedCategories = ROLE_FORUM_CATEGORIES[normalizeRoleName(user.role)] || ROLE_FORUM_CATEGORIES.EMLAKCI;

    if (!allowedCategories.includes(category)) {
      throw new BadRequestException('Bu kategori rolünüz için uygun değil.');
    }

    const title = cleanForumText(dto.title);
    const description = cleanForumText(dto.description);

    if (mode === 'create' && !title) {
      throw new BadRequestException('Talep başlığı zorunludur.');
    }

    if (mode === 'create' && description.length < 12) {
      throw new BadRequestException('Talep açıklaması en az 12 karakter olmalıdır.');
    }

    if (description.length > MAX_FORUM_DESCRIPTION_LENGTH) {
      throw new BadRequestException(`Talep açıklaması en fazla ${MAX_FORUM_DESCRIPTION_LENGTH} karakter olabilir.`);
    }

    if (requiresForumCity(category) && !cleanForumText(dto.city)) {
      throw new BadRequestException('Şehir alanı zorunludur.');
    }

    if (requiresForumProperty(category) && !cleanForumText((dto as CreateNetworkPostDto).tags?.find((item) => String(item || '').trim()) || '')) {
      // Frontend mülk/konu bilgisini tags içine de gönderir. Eski kayıt uyumluluğu için sert engel sadece başlık/açıklama/şehir/kategori tarafında tutuldu.
    }

    return {
      category,
      title,
      description,
    };
  }

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

    const [followerCount, viewCount, uniqueViewerCount] = await Promise.all([
      this.prisma.networkPostFollower.count({
        where: {
          postId: id,
        },
      }),
      this.prisma.networkPostView.count({
        where: {
          postId: id,
        },
      }),
      this.prisma.networkPostView
        .groupBy({
          by: ['userId'],
          where: {
            postId: id,
            userId: {
              not: null,
            },
          },
        })
        .then((items) => items.length),
    ]);

    return {
      postId: post.id,
      postTitle: post.title,
      total: conversations.length,
      followerCount,
      viewCount,
      uniqueViewerCount,
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

  async recordPostView(id: string, userId?: string) {
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

    await this.prisma.networkPostView.create({
      data: {
        postId: id,
        userId: userId || null,
      },
    });

    const [viewCount, uniqueViewerCount] = await Promise.all([
      this.prisma.networkPostView.count({
        where: {
          postId: id,
        },
      }),
      this.prisma.networkPostView
        .groupBy({
          by: ['userId'],
          where: {
            postId: id,
            userId: {
              not: null,
            },
          },
        })
        .then((items) => items.length),
    ]);

    return {
      postId: id,
      viewCount,
      uniqueViewerCount,
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


  async getNotifications(userId: string) {
    if (!userId) {
      return {
        unreadCount: 0,
        items: [],
      };
    }

    const [unreadCount, items] = await Promise.all([
      this.prisma.networkNotification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
      this.prisma.networkNotification.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 12,
      }),
    ]);

    return {
      unreadCount,
      items,
    };
  }

  async markNotificationsAsRead(userId: string) {
    if (!userId) {
      return {
        ok: false,
        unreadCount: 0,
      };
    }

    await this.prisma.networkNotification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return {
      ok: true,
      unreadCount: 0,
    };
  }

  private buildPushBody(changes: NetworkPostChangeItem[]) {
    const labels = changes.map((change) => change.label);

    if (labels.includes('Bütçe')) {
      const budgetChange = changes.find((change) => change.label === 'Bütçe');

      if (budgetChange) {
        return `Takip ettiğiniz ilanda fiyat değişti: ${formatNotificationValue(
          budgetChange.oldValue,
        )} → ${formatNotificationValue(budgetChange.newValue)}`;
      }

      return 'Takip ettiğiniz ilanda fiyat değişti.';
    }

    if (
      labels.includes('İl') ||
      labels.includes('İlçe') ||
      labels.includes('Mahalle')
    ) {
      return 'Takip ettiğiniz ilanda lokasyon değişti.';
    }

    if (labels.includes('Açıklama')) {
      return 'Takip ettiğiniz ilanda açıklama değişti.';
    }

    return 'Takip ettiğiniz ilanda güncelleme yapıldı.';
  }

  private async createUpdateNotifications(
    postId: string,
    ownerId: string,
    postTitle: string,
    changes: NetworkPostChangeItem[],
  ) {
    if (changes.length === 0) return;

    const followers = await this.prisma.networkPostFollower.findMany({
      where: {
        postId,
        userId: {
          not: ownerId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (followers.length === 0) return;

    const uniqueUserIds = Array.from(
      new Set(followers.map((follower) => follower.userId)),
    );

    const summary = summarizeChanges(changes);
    const message = buildNotificationMessage(changes);
    const pushBody = this.buildPushBody(changes);

    await this.prisma.networkNotification.createMany({
      data: uniqueUserIds.map((userId) => ({
        userId,
        postId,
        title: `${postTitle} güncellendi`,
        message: `${summary}\n\n${message}`,
      })),
    });

    await Promise.allSettled(
      uniqueUserIds.map((userId) =>
        this.pushService.sendToUser(userId, {
          title: 'EPH Pazaryeri',
          body: pushBody,
          url: `/network/${postId}`,
        }),
      ),
    );
  }


  async getPostFollowers(id: string) {
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

    const followers = await this.prisma.networkPostFollower.findMany({
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

    return followers.map((follow) => ({
      id: follow.id,
      followedAt: follow.createdAt,
      user: follow.user,
    }));
  }

  async getFeaturedPosts() {
    const now = new Date();

    const posts = await this.prisma.networkPost.findMany({
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
        _count: {
          select: {
            followers: true,
            Conversation: true,
            views: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return posts
      .map((post) => ({
        id: post.id,
        title: post.title,
        type: post.type,
        city: post.city,
        district: post.district,
        budget: post.budget,
        createdAt: post.createdAt,
        user: post.User,
        score:
          post._count.views +
          post._count.followers * 5 +
          post._count.Conversation * 8,
        viewCount: post._count.views,
        followerCount: post._count.followers,
        requestCount: post._count.Conversation,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
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

    const validated = await this.validateForumPostInput({
      ...dto,
      type: dto.type ?? existing.type,
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description,
      city: dto.city ?? existing.city,
    }, 'update');

    const nextData = {
      type: validated.category,
      title: dto.title ? validated.title : existing.title,
      description: dto.description ? validated.description : existing.description,
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

      await this.createUpdateNotifications(
        id,
        dto.userId,
        updatedPost.title,
        changes,
      );
    }

    return updatedPost;
  }

  async create(dto: CreateNetworkPostDto) {
    const validated = await this.validateForumPostInput(dto, 'create');

    return this.prisma.networkPost.create({
      data: {
        id: randomUUID(),
        userId: dto.userId,
        type: validated.category,
        title: validated.title,
        description: validated.description,
        city: dto.city || null,
        district: dto.district || null,
        neighborhood: dto.neighborhood || null,
        budget: dto.budget || null,
        urgency: dto.urgency || 'Normal',
        visibility: (dto.visibility as any) || 'TUM_EPH',
        tags: [FORUM_CATEGORY_LABELS[validated.category], ...(dto.tags || [])]
          .filter(Boolean)
          .slice(0, 10),
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
