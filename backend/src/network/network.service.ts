import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  KontorHareketTuru,
  KontorIslemTuru,
  Prisma,
  UyelikDurumu,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { PushService } from "../push/push.service";

const PLATFORM_URL =
  process.env.FRONTEND_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  "https://emlakportfoyhavuzu.com";

type CreateNetworkPostDto = {
  userId: string;
  type: string;
  title: string;
  description?: string;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  budget?: number | null;
  minArea?: number | null;
  maxArea?: number | null;
  minRoom?: number | null;
  maxRoom?: number | null;
  minBudget?: number | null;
  maxBudget?: number | null;
  areas?: Array<{
    city?: string | null;
    district?: string | null;
    neighborhood?: string | null;
  }> | null;
  urgency?: string | null;
  visibility?: string;
  tags?: string[];
  expiresAt?: string;
};

type CurrentUserPayload = {
  id?: string;
  sub?: string;
  role?: string;
  email?: string;
};

type ForumActionPayload = {
  message?: string;
  note?: string;
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
  minArea?: number | null;
  maxArea?: number | null;
  minRoom?: number | null;
  maxRoom?: number | null;
  minBudget?: number | null;
  maxBudget?: number | null;
  areas?: Array<{
    city?: string | null;
    district?: string | null;
    neighborhood?: string | null;
  }> | null;
  urgency?: string | null;
  visibility?: string;
  tags?: string[];
  expiresAt?: string;
};

const MAX_FORUM_TITLE_LENGTH = 50;
const MAX_FORUM_TOPIC_LENGTH = 100;
const MAX_FORUM_DESCRIPTION_LENGTH = 200;

type NetworkPostChangeItem = {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
};

function normalizeValue(value: unknown) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join(",");
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function valuesChanged(oldValue: unknown, newValue: unknown) {
  return normalizeValue(oldValue) !== normalizeValue(newValue);
}

function summarizeChanges(changes: NetworkPostChangeItem[]) {
  const labels = changes.map((change) => change.label);

  if (labels.includes("Bütçe")) return "Bu ilanda fiyat değişti.";
  if (labels.includes("Açıklama")) return "Bu ilanda açıklama değişti.";
  if (
    labels.includes("İl") ||
    labels.includes("İlçe") ||
    labels.includes("Mahalle")
  ) {
    return "Bu ilanda lokasyon değişti.";
  }

  return `Bu ilanda ${labels.join(", ")} değişti.`;
}

function formatNotificationValue(value: unknown) {
  if (value == null || value === "") return "Boş";
  if (Array.isArray(value)) return value.join(", ") || "Boş";

  if (value instanceof Date) {
    return value.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (typeof value === "number") {
    return `${value.toLocaleString("tr-TR")} TL`;
  }

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    return new Date(text).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return text;
}

function buildNotificationMessage(changes: NetworkPostChangeItem[]) {
  const important = changes.slice(0, 4);

  if (important.length === 0) {
    return "Takip ettiğiniz ilanda güncelleme yapıldı.";
  }

  const lines = important.map((change) => {
    return `${change.label}: ${formatNotificationValue(change.oldValue)} → ${formatNotificationValue(change.newValue)}`;
  });

  return `Takip ettiğiniz ilanda güncelleme yapıldı.\n\n${lines.join("\n")}`;
}

const FORUM_CATEGORY_LABELS: Record<string, string> = {
  PORTFOY_ARIYORUM: "Portföy Arıyorum",
  KAT_KARSILIGI_ARSA_ARIYORUM: "Kat Karşılığı Arsa Arıyorum",
  BOLGESEL_SATIS_OFISI_ARIYORUM: "Bölgesel Satış Ofisi Arıyorum",
  IS_ORTAGI_ARIYORUM: "İş Ortağı Arıyorum",
  YATIRIMCI_ARIYORUM: "Yatırımcı Arıyorum",
  SEKTOREL_IHTIYACLAR: "Sektörel İhtiyaçlar",
  DUYURU: "Duyuru",
  KAMPANYA_DUYURU: "Kampanya & Duyuru",
  DIGER: "Diğer",

  // Eski kayıtlarla geriye dönük uyumluluk
  BOLGE_ORTAGI_ARIYORUM: "Bölge Ortağı Arıyorum",
  PORTFOY_ORTAGI_ARIYORUM: "Portföy Ortağı Arıyorum",
  SATIS_OFISI_ARIYORUM: "Satış Ofisi Arıyorum",
  KAMPANYA_DUYURULARI: "Kampanya Duyuruları",
  MUTEAHHIT_YUKLENICI_ARIYORUM: "Müteahhit / Yüklenici Arıyorum",
  ULUSAL_BOLGESEL_SATIS_PARTNERI_ARIYORUM:
    "Ulusal/Bölgesel Satış Partneri Arıyorum",
  PLATFORM_DUYURUSU: "Platform Duyurusu",
  SISTEM_GUNCELLEMESI: "Sistem Güncellemesi",
  EGITIM_BILGILENDIRME: "Eğitim / Bilgilendirme",
  SEKTOREL_SORU: "Sektörel Soru",
};

const FORUM_REQUEST_TYPES_BY_CATEGORY: Record<string, string[]> = {
  PORTFOY_ARIYORUM: ["PORTFOY_KIRALIK", "PORTFOY_SATILIK"],
  KAT_KARSILIGI_ARSA_ARIYORUM: ["ARSA_KONUT_PROJESI", "ARSA_TICARI_PROJE", "ARSA_KARMA_PROJE", "ARSA_KENTSEL_DONUSUM"],
  BOLGESEL_SATIS_OFISI_ARIYORUM: ["SATIS_OFISI_PROJE", "SATIS_OFISI_BOLGESEL_PARTNER", "SATIS_OFISI_TEK_YETKILI", "SATIS_OFISI_BAYILIK_TEMSILCILIK"],
  IS_ORTAGI_ARIYORUM: ["IS_ORTAGI_PORTFOY", "IS_ORTAGI_PROJE", "IS_ORTAGI_COZUM", "IS_ORTAGI_YUKLENICI_TASERON"],
  YATIRIMCI_ARIYORUM: ["YATIRIMCI_ARSA", "YATIRIMCI_PROJE", "YATIRIMCI_FINANSMAN", "YATIRIMCI_KURUMSAL"],
  SEKTOREL_IHTIYACLAR: ["HIZMET_EKSPERTIZ", "HIZMET_TAPU_HUKUK", "HIZMET_FOTOGRAF_DRONE", "HIZMET_MIMARLIK_MUHENDISLIK", "HIZMET_REKLAM_PAZARLAMA", "HIZMET_DIGER"],
  DUYURU: ["DUYURU_GENEL", "DUYURU_ETKINLIK_EGITIM", "DUYURU_PLATFORM", "DUYURU_BOLGESEL"],
  KAMPANYA_DUYURU: ["KAMPANYA_LANSMAN", "KAMPANYA_SATIS", "KAMPANYA_FIYAT_GUNCELLEME", "KAMPANYA_ETKINLIK_TANITIM"],
  DIGER: ["DIGER_GENEL_TALEP", "DIGER_BILGI_DESTEK", "DIGER_LISTE_DISI"],
};

const FORUM_REQUEST_TYPE_ALIASES: Record<string, string> = {
  "kiralık arıyorum": "PORTFOY_KIRALIK",
  "kiralik ariyorum": "PORTFOY_KIRALIK",
  "kiralık portföy arıyorum": "PORTFOY_KIRALIK",
  "satılık arıyorum": "PORTFOY_SATILIK",
  "satilik ariyorum": "PORTFOY_SATILIK",
  "satılık portföy arıyorum": "PORTFOY_SATILIK",
};

function normalizeForumRequestType(value?: string | null) {
  const raw = cleanForumText(value);
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (Object.values(FORUM_REQUEST_TYPES_BY_CATEGORY).some((items) => items.includes(upper))) return upper;
  return FORUM_REQUEST_TYPE_ALIASES[raw.toLocaleLowerCase("tr-TR")] || raw;
}

function buildForumTags(category: string, requestType: string, tags?: string[] | null) {
  const cleaned = (tags || [])
    .map((item) => cleanForumText(item))
    .filter(Boolean)
    .filter((item) => !item.startsWith("Talep Türü:"))
    .filter((item) => !FORUM_CATEGORY_LABELS[normalizeForumCategory(item)]);

  return [FORUM_CATEGORY_LABELS[category], `Talep Türü:${requestType}`, ...cleaned]
    .filter(Boolean)
    .slice(0, 10);
}

const ROLE_FORUM_CATEGORIES: Record<string, string[]> = {
  EMLAKCI: [
    "PORTFOY_ARIYORUM",
    "KAT_KARSILIGI_ARSA_ARIYORUM",
    "SEKTOREL_IHTIYACLAR",
    "DUYURU",
  ],
  MUTEAHHIT: [
    "BOLGESEL_SATIS_OFISI_ARIYORUM",
    "KAT_KARSILIGI_ARSA_ARIYORUM",
    "KAMPANYA_DUYURU",
    "SEKTOREL_IHTIYACLAR",
    "DIGER",
  ],
  INSAAT_FIRMASI: [
    "KAT_KARSILIGI_ARSA_ARIYORUM",
    "BOLGESEL_SATIS_OFISI_ARIYORUM",
    "IS_ORTAGI_ARIYORUM",
    "YATIRIMCI_ARIYORUM",
    "SEKTOREL_IHTIYACLAR",
    "KAMPANYA_DUYURU",
    "DIGER",
  ],
  ADMIN: ["DUYURU", "SEKTOREL_IHTIYACLAR"],
  SUPER_ADMIN: Object.keys(FORUM_CATEGORY_LABELS),
};

function normalizeRoleName(role?: string | null) {
  return String(role || "")
    .trim()
    .toUpperCase();
}

function normalizeForumCategory(value?: string | null) {
  const raw = String(value || "").trim();
  const upper = raw.toUpperCase();

  if (FORUM_CATEGORY_LABELS[upper]) return upper;

  const labelMatch = Object.entries(FORUM_CATEGORY_LABELS).find(([, label]) => {
    return label.toLocaleLowerCase("tr-TR") === raw.toLocaleLowerCase("tr-TR");
  });

  if (labelMatch) return labelMatch[0];

  return "";
}

function requiresForumCity(category: string) {
  return ![
    "DUYURU",
    "KAMPANYA_DUYURU",
    "PLATFORM_DUYURUSU",
    "SISTEM_GUNCELLEMESI",
    "EGITIM_BILGILENDIRME",
  ].includes(category);
}

function requiresForumProperty(category: string) {
  return ["PORTFOY_ARIYORUM", "KAT_KARSILIGI_ARSA_ARIYORUM"].includes(category);
}

function cleanForumText(value?: string | null) {
  return String(value || "").trim();
}

function isForumManagerRole(role?: string | null) {
  const normalizedRole = normalizeRoleName(role);

  return normalizedRole === "SUPER_ADMIN";
}

@Injectable()
export class NetworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  private async validateForumPostInput(
    dto: CreateNetworkPostDto | UpdateNetworkPostDto,
    mode: "create" | "update",
    permissionUserId?: string,
  ) {
    const userId = cleanForumText(dto.userId);

    if (!userId) {
      throw new BadRequestException(
        "Kullanıcı bilgisi olmadan forum talebi oluşturulamaz.",
      );
    }

    const permissionUser = await this.prisma.user.findUnique({
      where: { id: cleanForumText(permissionUserId) || userId },
      select: { id: true, role: true },
    });

    if (!permissionUser) {
      throw new BadRequestException("Forum talebi için kullanıcı bulunamadı.");
    }

    const category = normalizeForumCategory(dto.type);

    if (!category) {
      throw new BadRequestException("Lütfen talep kategorisini seçin.");
    }

    const normalizedPermissionRole = normalizeRoleName(permissionUser.role);
    const allowedCategories =
      ROLE_FORUM_CATEGORIES[normalizedPermissionRole] ||
      ROLE_FORUM_CATEGORIES.EMLAKCI;

    if (normalizedPermissionRole !== "SUPER_ADMIN" && !allowedCategories.includes(category)) {
      throw new BadRequestException("Bu kategori rolünüz için uygun değil.");
    }

    const requestType = normalizeForumRequestType(
      cleanForumText(
        (dto as CreateNetworkPostDto).tags?.find((item) =>
          cleanForumText(item).startsWith("Talep Türü:"),
        ) || "",
      ).replace(/^Talep Türü:\s*/i, ""),
    );

    const allowedRequestTypes = FORUM_REQUEST_TYPES_BY_CATEGORY[category] || [];

    if (!requestType) {
      throw new BadRequestException("Lütfen talep türünü seçin.");
    }

    if (!allowedRequestTypes.includes(requestType)) {
      throw new BadRequestException("Seçilen talep türü bu kategoriyle uyumlu değil.");
    }

    const title = cleanForumText(dto.title);
    const description = cleanForumText(dto.description);

    if (mode === "create" && !title) {
      throw new BadRequestException("Talep başlığı zorunludur.");
    }

    if (title.length > MAX_FORUM_TITLE_LENGTH) {
      throw new BadRequestException(
        `Talep başlığı en fazla ${MAX_FORUM_TITLE_LENGTH} karakter olabilir.`,
      );
    }

    if (mode === "create" && description.length < 12) {
      throw new BadRequestException(
        "Talep açıklaması en az 12 karakter olmalıdır.",
      );
    }

    if (description.length > MAX_FORUM_DESCRIPTION_LENGTH) {
      throw new BadRequestException(
        `Talep açıklaması en fazla ${MAX_FORUM_DESCRIPTION_LENGTH} karakter olabilir.`,
      );
    }

    if (requiresForumCity(category) && !cleanForumText(dto.city)) {
      throw new BadRequestException("Şehir alanı zorunludur.");
    }

    if (
      requiresForumProperty(category) &&
      !cleanForumText(
        (dto as CreateNetworkPostDto).tags?.find((item) =>
          String(item || "").trim(),
        ) || "",
      )
    ) {
      // Frontend mülk/konu bilgisini tags içine de gönderir. Eski kayıt uyumluluğu için sert engel sadece başlık/açıklama/şehir/kategori tarafında tutuldu.
    }

    const topicTag = cleanForumText(
      (dto as CreateNetworkPostDto).tags?.find((item) => {
        const cleanItem = cleanForumText(item);

        return (
          cleanItem &&
          !cleanItem.startsWith("Döviz:") &&
          !cleanItem.startsWith("Talep Türü:") &&
          !FORUM_CATEGORY_LABELS[normalizeForumCategory(cleanItem)]
        );
      }) || "",
    );

    if (topicTag.length > MAX_FORUM_TOPIC_LENGTH) {
      throw new BadRequestException(
        `Konu en fazla ${MAX_FORUM_TOPIC_LENGTH} karakter olabilir.`,
      );
    }

    return {
      category,
      requestType,
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
        createdAt: "desc",
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
      throw new NotFoundException("Pazaryeri paylaşımı bulunamadı.");
    }

    return post;
  }

  async createNetworkPostShareLink(id: string, actionUserId: string) {
    const post = await this.prisma.networkPost.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException("Pazaryeri paylaşımı bulunamadı.");
    }

    const shareLink = await this.prisma.networkPostShareLink.create({
      data: {
        token: randomUUID(),
        postId: post.id,
        sharedById: actionUserId,
      },
    });

    return {
      token: shareLink.token,
      url: `${PLATFORM_URL}/talep-paylasim/${shareLink.token}`,
    };
  }

  async getNetworkPostShareByToken(token: string) {
    const shareLink = await this.prisma.networkPostShareLink.findUnique({
      where: { token },
    });

    if (!shareLink) {
      throw new NotFoundException("Paylaşım bağlantısı bulunamadı.");
    }

    const post = await this.prisma.networkPost.findFirst({
      where: {
        id: shareLink.postId,
        isActive: true,
      },
    });

    if (!post) {
      throw new NotFoundException("Bu talep artık aktif değil.");
    }

    const sharedBy = await this.prisma.user.findUnique({
      where: { id: shareLink.sharedById },
      select: { firstName: true, lastName: true, phone: true },
    });

    await this.prisma.networkPostShareLink.update({
      where: { id: shareLink.id },
      data: { viewCount: { increment: 1 } },
    });

    return {
      id: post.id,
      type: post.type,
      title: post.title,
      description: post.description,
      city: post.city,
      district: post.district,
      neighborhood: post.neighborhood,
      budget: post.budget,
      urgency: post.urgency,
      tags: post.tags,
      createdAt: post.createdAt,
      sharedBy: sharedBy
        ? {
            fullName:
              this.cleanForumActionText(
                `${sharedBy.firstName} ${sharedBy.lastName}`,
              ) || "EPH Yetkilisi",
            phone: sharedBy.phone || null,
          }
        : null,
    };
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
      throw new NotFoundException("Pazaryeri paylaşımı bulunamadı.");
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
            createdAt: "desc",
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
        updatedAt: "desc",
      },
    });

    const byTitleMap = new Map<string, number>();

    conversations.forEach((conversation) => {
      const title = conversation.title || "EPH GÖRÜŞMESİ";
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
          by: ["userId"],
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
      throw new NotFoundException("Pazaryeri paylaşımı bulunamadı.");
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
          by: ["userId"],
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
        createdAt: "desc",
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
      throw new NotFoundException("Pazaryeri paylaşımı bulunamadı.");
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
        message: "Takip işlemi için kullanıcı bilgisi eksik.",
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
      throw new NotFoundException("Pazaryeri paylaşımı bulunamadı.");
    }

    if (post.userId === userId) {
      return {
        ok: false,
        message: "Kendi paylaşımınızı takip etmenize gerek yok.",
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
        message: "Takipten çıkmak için kullanıcı bilgisi eksik.",
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
        createdAt: "desc",
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
          createdAt: "desc",
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

    if (labels.includes("Bütçe")) {
      const budgetChange = changes.find((change) => change.label === "Bütçe");

      if (budgetChange) {
        return `Takip ettiğiniz ilanda fiyat değişti: ${formatNotificationValue(
          budgetChange.oldValue,
        )} → ${formatNotificationValue(budgetChange.newValue)}`;
      }

      return "Takip ettiğiniz ilanda fiyat değişti.";
    }

    if (
      labels.includes("İl") ||
      labels.includes("İlçe") ||
      labels.includes("Mahalle")
    ) {
      return "Takip ettiğiniz ilanda lokasyon değişti.";
    }

    if (labels.includes("Açıklama")) {
      return "Takip ettiğiniz ilanda açıklama değişti.";
    }

    return "Takip ettiğiniz ilanda güncelleme yapıldı.";
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
          title: "EPH Pazaryeri",
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
      throw new NotFoundException("Pazaryeri paylaşımı bulunamadı.");
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
        createdAt: "desc",
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
        createdAt: "desc",
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

  private async getNetworkActionUser(userId?: string | null) {
    const cleanUserId = cleanForumText(userId);

    if (!cleanUserId) {
      throw new BadRequestException("İşlem için kullanıcı bilgisi eksik.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: cleanUserId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new BadRequestException("İşlem yapan kullanıcı bulunamadı.");
    }

    return user;
  }

  private ensureCanManageNetworkPost(
    ownerId: string,
    actionUser: { id: string; role?: string | null },
  ) {
    if (ownerId === actionUser.id) return;
    if (isForumManagerRole(actionUser.role)) return;

    throw new ForbiddenException("Bu paylaşım için işlem yetkiniz yok.");
  }

  async update(id: string, dto: UpdateNetworkPostDto, actionUserId: string) {
    const existing = await this.prisma.networkPost.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Pazaryeri paylaşımı bulunamadı.");
    }

    const actionUser = await this.getNetworkActionUser(actionUserId);
    this.ensureCanManageNetworkPost(existing.userId, actionUser);

    const validated = await this.validateForumPostInput(
      {
        ...dto,
        userId: existing.userId,
        type: dto.type ?? existing.type,
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        city: dto.city ?? existing.city,
        tags: dto.tags ?? existing.tags,
      },
      "update",
      actionUser.id,
    );

    const nextData = {
      type: validated.category,
      title: dto.title ? validated.title : existing.title,
      description: dto.description
        ? validated.description
        : existing.description,
      city: dto.areas?.[0]?.city ?? dto.city ?? existing.city,
      district: dto.areas?.[0]?.district ?? dto.district ?? existing.district,
      neighborhood:
        dto.areas?.[0]?.neighborhood ??
        dto.neighborhood ??
        existing.neighborhood,
      budget: dto.budget ?? existing.budget,
      minArea: dto.minArea ?? existing.minArea,
      maxArea: dto.maxArea ?? existing.maxArea,
      minRoom: dto.minRoom ?? existing.minRoom,
      maxRoom: dto.maxRoom ?? existing.maxRoom,
      minBudget: dto.minBudget ?? existing.minBudget,
      maxBudget: dto.maxBudget ?? existing.maxBudget,
      ...(dto.areas
        ? { areas: dto.areas as unknown as Prisma.InputJsonValue }
        : {}),
      urgency: dto.urgency ?? existing.urgency,
      visibility: (dto.visibility as any) ?? existing.visibility,
      tags: buildForumTags(
        validated.category,
        validated.requestType,
        dto.tags ?? existing.tags,
      ),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : existing.expiresAt,
    };

    const changes: NetworkPostChangeItem[] = [];

    const watchedFields: Array<{
      field: keyof typeof nextData;
      label: string;
    }> = [
      { field: "type", label: "Paylaşım tipi" },
      { field: "title", label: "Başlık" },
      { field: "description", label: "Açıklama" },
      { field: "city", label: "İl" },
      { field: "district", label: "İlçe" },
      { field: "neighborhood", label: "Mahalle" },
      { field: "budget", label: "Bütçe" },
      { field: "urgency", label: "Aciliyet" },
      { field: "visibility", label: "Görünürlük" },
      { field: "tags", label: "Etiketler" },
      { field: "expiresAt", label: "Geçerlilik tarihi" },
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
          userId: actionUser.id,
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
        actionUser.id,
        updatedPost.title,
        changes,
      );
    }

    return updatedPost;
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.networkPost.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Pazaryeri paylaşımı bulunamadı.");
    }

    const actionUser = await this.getNetworkActionUser(userId);
    this.ensureCanManageNetworkPost(existing.userId, actionUser);

    await this.prisma.networkPost.update({
      where: {
        id,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return {
      ok: true,
      postId: id,
      deletedBy: actionUser.id,
      message: "Talep başarıyla silindi.",
    };
  }

  async create(dto: CreateNetworkPostDto, actionUserId: string) {
    const validated = await this.validateForumPostInput(
      { ...dto, userId: actionUserId },
      "create",
    );

    return this.prisma.$transaction(async (tx) => {
      // Madde 33: aylik forum talebi limiti asilinca her yeni talep 20 kontor
      const aktifPaket = await tx.kullaniciUyelikPaketi.findFirst({
        where: { kullaniciId: actionUserId, durum: UyelikDurumu.AKTIF },
        orderBy: { baslangicTarihi: "desc" },
      });
      const paket = aktifPaket
        ? await tx.uyelikPaketi.findUnique({
            where: { id: aktifPaket.paketId },
          })
        : null;
      const aylikLimit = paket?.aylikForumKonusuLimiti ?? null;

      const now = new Date();
      const ayBasi = new Date(now.getFullYear(), now.getMonth(), 1);
      const buAyTalepSayisi =
        aylikLimit == null
          ? 0
          : await tx.networkPost.count({
              where: {
                userId: actionUserId,
                createdAt: { gte: ayBasi },
              },
            });
      const limitAsildi =
        aylikLimit != null && buAyTalepSayisi >= aylikLimit;

      const post = await tx.networkPost.create({
      data: {
        id: randomUUID(),
        userId: actionUserId,
        type: validated.category,
        title: validated.title,
        description: validated.description,
        city: dto.areas?.[0]?.city || dto.city || null,
        district: dto.areas?.[0]?.district || dto.district || null,
        neighborhood: dto.areas?.[0]?.neighborhood || dto.neighborhood || null,
        budget: dto.budget || null,
        minArea: dto.minArea ?? null,
        maxArea: dto.maxArea ?? null,
        minRoom: dto.minRoom ?? null,
        maxRoom: dto.maxRoom ?? null,
        minBudget: dto.minBudget ?? null,
        maxBudget: dto.maxBudget ?? null,
        areas: dto.areas
          ? (dto.areas as unknown as Prisma.InputJsonValue)
          : undefined,
        urgency: dto.urgency || "Normal",
        visibility: (dto.visibility as any) || "TUM_EPH",
        tags: buildForumTags(
          validated.category,
          validated.requestType,
          dto.tags,
        ),
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

      if (limitAsildi) {
        await this.spendForumKontor(tx, {
          userId: actionUserId,
          amount: 20,
          islemTuru: KontorIslemTuru.FORUM_TALEP_OLUSTURMA,
          aciklama: `Aylik forum talebi limiti (${aylikLimit}) asildigi icin talep olusturma bedeli: 20 kontor.`,
          postId: post.id,
        });
      }

      return post;
    });
  }

  private getForumActionUserId(user?: CurrentUserPayload): string {
    const userId = String(user?.id || user?.sub || "").trim();

    if (!userId) {
      throw new ForbiddenException(
        "Forum işlemi için kullanıcı kimliği doğrulanamadı.",
      );
    }

    return userId;
  }

  private cleanForumActionText(value?: string | null): string {
    return String(value || "").trim().slice(0, 1000);
  }

  private async getForumActionContext(
    tx: Prisma.TransactionClient,
    postId: string,
    user?: CurrentUserPayload,
  ) {
    const actorId = this.getForumActionUserId(user);

    const [post, actor] = await Promise.all([
      tx.networkPost.findFirst({
        where: {
          id: postId,
          isActive: true,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          userId: true,
          title: true,
        },
      }),
      tx.user.findUnique({
        where: {
          id: actorId,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      }),
    ]);

    if (!post) {
      throw new NotFoundException(
        "Aktif Forum paylaşımı bulunamadı.",
      );
    }

    if (!actor) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    if (post.userId === actorId) {
      throw new BadRequestException(
        "Kendi Forum paylaşımınız için bu işlemi yapamazsınız.",
      );
    }

    const actorName =
      `${actor.firstName || ""} ${actor.lastName || ""}`.trim() ||
      actor.email;

    return {
      actorId,
      actorName,
      post,
    };
  }

  private async spendForumKontor(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      amount: number;
      islemTuru: KontorIslemTuru;
      aciklama: string;
      postId: string;
    },
  ) {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${`forum-wallet:${input.userId}`})
      )
    `;

    let wallet = await tx.kontorCuzdani.findUnique({
      where: {
        kullaniciId: input.userId,
      },
    });

    if (!wallet) {
      wallet = await tx.kontorCuzdani.create({
        data: {
          kullaniciId: input.userId,
          bakiye: 0,
          toplamYukleme: 0,
          toplamHarcama: 0,
          toplamHediye: 0,
          aktifMi: true,
        },
      });
    }

    if (!wallet.aktifMi) {
      throw new BadRequestException(
        "Kontör cüzdanınız aktif değil.",
      );
    }

    if (wallet.bakiye < input.amount) {
      throw new BadRequestException(
        `Bu işlem için ${input.amount} kontör gerekir. Mevcut bakiyeniz ${wallet.bakiye} kontör.`,
      );
    }

    const nextBalance = wallet.bakiye - input.amount;

    const updatedWallet = await tx.kontorCuzdani.update({
      where: {
        kullaniciId: input.userId,
      },
      data: {
        bakiye: nextBalance,
        toplamHarcama: {
          increment: input.amount,
        },
      },
    });

    const movement = await tx.kontorHareketi.create({
      data: {
        kullaniciId: input.userId,
        hareketTuru: KontorHareketTuru.HARCAMA,
        islemTuru: input.islemTuru,
        miktar: input.amount,
        oncekiBakiye: wallet.bakiye,
        sonrakiBakiye: nextBalance,
        aciklama: input.aciklama,
        ilgiliKayitTuru: "NETWORK_POST",
        ilgiliKayitId: input.postId,
        olusturanId: input.userId,
      },
    });

    return {
      wallet: updatedWallet,
      movement,
    };
  }

  async messagePost(
    postId: string,
    user: CurrentUserPayload,
    body?: ForumActionPayload,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const context = await this.getForumActionContext(
        tx,
        postId,
        user,
      );

      const kontorResult = await this.spendForumKontor(tx, {
        userId: context.actorId,
        amount: 3,
        islemTuru: KontorIslemTuru.FORUM_MESAJ,
        aciklama: `${context.post.title} Forum paylaşımı için mesaj başlatıldı.`,
        postId: context.post.id,
      });

      const participantIds = [
        context.actorId,
        context.post.userId,
      ].sort();

      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${`forum-conversation:${context.post.id}:${participantIds.join(":")}`})
        )
      `;

      const existingConversation =
        await tx.conversation.findFirst({
          where: {
            postId: context.post.id,
            AND: [
              {
                ConversationParticipant: {
                  some: {
                    userId: context.actorId,
                  },
                },
              },
              {
                ConversationParticipant: {
                  some: {
                    userId: context.post.userId,
                  },
                },
              },
            ],
          },
          include: {
            ConversationParticipant: true,
          },
        });

      const conversation =
        existingConversation &&
        existingConversation.ConversationParticipant.length === 2
          ? existingConversation
          : await tx.conversation.create({
              data: {
                id: randomUUID(),
                postId: context.post.id,
                title: `Forum Mesajı - ${context.post.title}`,
                updatedAt: new Date(),
                ConversationParticipant: {
                  create: [
                    {
                      id: randomUUID(),
                      userId: context.actorId,
                    },
                    {
                      id: randomUUID(),
                      userId: context.post.userId,
                    },
                  ],
                },
              },
              include: {
                ConversationParticipant: true,
              },
            });

      const message =
        this.cleanForumActionText(body?.message) ||
        `Merhaba, "${context.post.title}" başlıklı Forum paylaşımınız hakkında görüşmek istiyorum.`;

      await tx.message.create({
        data: {
          id: randomUUID(),
          conversationId: conversation.id,
          senderId: context.actorId,
          body: message,
        },
      });

      await tx.conversation.update({
        where: {
          id: conversation.id,
        },
        data: {
          updatedAt: new Date(),
        },
      });

      await tx.networkNotification.create({
        data: {
          userId: context.post.userId,
          postId: context.post.id,
          title: "Forum mesajı başlatıldı",
          message: `${context.actorName}, "${context.post.title}" paylaşımınız için mesaj gönderdi.`,
        },
      });

      return {
        ok: true,
        message: "Forum mesajı başlatıldı. 3 kontör harcandı.",
        cost: 3,
        spent: 3,
        previousBalance:
          kontorResult.movement.oncekiBakiye,
        remainingBalance:
          kontorResult.wallet.bakiye,
        balance:
          kontorResult.wallet.bakiye,
        conversationId: conversation.id,
        url: `/messages/${conversation.id}`,
      };
    });
  }

  async interestPost(
    postId: string,
    user: CurrentUserPayload,
    body?: ForumActionPayload,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const context = await this.getForumActionContext(
        tx,
        postId,
        user,
      );

      const kontorResult = await this.spendForumKontor(tx, {
        userId: context.actorId,
        amount: 10,
        islemTuru:
          KontorIslemTuru.FORUM_ILGILENIYORUM,
        aciklama: `${context.post.title} Forum paylaşımı için ilgileniyorum bildirimi gönderildi.`,
        postId: context.post.id,
      });

      const note = this.cleanForumActionText(body?.note);
      const noteText = note ? ` Not: ${note}` : "";

      await tx.networkNotification.create({
        data: {
          userId: context.post.userId,
          postId: context.post.id,
          title: "Forum paylaşımınızla ilgilenen var",
          message: `${context.actorName}, "${context.post.title}" paylaşımınızla ilgileniyor.${noteText}`,
        },
      });

      return {
        ok: true,
        message:
          "İlgileniyorum bildirimi gönderildi. 10 kontör harcandı.",
        cost: 10,
        spent: 10,
        previousBalance:
          kontorResult.movement.oncekiBakiye,
        remainingBalance:
          kontorResult.wallet.bakiye,
        balance:
          kontorResult.wallet.bakiye,
      };
    });
  }

  async helpPost(
    postId: string,
    user: CurrentUserPayload,
    body?: ForumActionPayload,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const context = await this.getForumActionContext(
        tx,
        postId,
        user,
      );

      const kontorResult = await this.spendForumKontor(tx, {
        userId: context.actorId,
        amount: 10,
        islemTuru:
          KontorIslemTuru.FORUM_YARDIMCI_OLABILIRIM,
        aciklama: `${context.post.title} Forum paylaşımı için yardımcı olabilirim bildirimi gönderildi.`,
        postId: context.post.id,
      });

      const note = this.cleanForumActionText(body?.note);
      const noteText = note ? ` Not: ${note}` : "";

      await tx.networkNotification.create({
        data: {
          userId: context.post.userId,
          postId: context.post.id,
          title: "Forum paylaşımınıza yardım teklifi",
          message: `${context.actorName}, "${context.post.title}" paylaşımınız için yardımcı olabileceğini bildirdi.${noteText}`,
        },
      });

      return {
        ok: true,
        message:
          "Yardımcı olabilirim bildirimi gönderildi. 10 kontör harcandı.",
        cost: 10,
        spent: 10,
        previousBalance:
          kontorResult.movement.oncekiBakiye,
        remainingBalance:
          kontorResult.wallet.bakiye,
        balance:
          kontorResult.wallet.bakiye,
      };
    });
  }


}
