import { consumeMembershipQuota } from '../membership/membership-quota.rules';
import { consumeLots, lockWallet } from '../kontor/wallet-lots';
import { resolveOfficeWallet } from '../office/office-wallet.rules';
import { TextSafetyField } from '../text-safety/text-safety.types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  KontorHareketTuru,
  KontorIslemTuru,
  Prisma,
  Role,
} from "@prisma/client";
import { createHash, randomUUID } from "crypto";
import { visibleAuthor, blockedPeerIds } from "../content-safety/block-policy";
import {
  generateRequestListingNumber,
  isValidRequestListingNumber,
  listingNumber,
  parseListingNumberOrId,
} from '../common/listing-number';
import { PrismaService } from "../prisma/prisma.service";
import { parseCostValue, readCost } from "../pricing/commercial-costs";
import { AdminService } from "../admin/admin.service";
import { PropertyCriteriaService } from "../property-criteria/property-criteria.service";
import { PropertyDemandAdapter } from "../property-demand/property-demand.adapter";
import { PropertyValidationService } from "../property-validation/property-validation.service";
import { PropertyValidationContext } from "../property-validation/property-validation.types";
import { TextSafetyService } from "../text-safety/text-safety.service";
import { PushService } from "../push/push.service";
import { NETWORK_CONTACT_OWNER_SELECT, networkProfessionalContact, networkContactPhone, networkOwnerLabel, networkPaidAccessWhere } from './network-contact-policy';

type NetworkAccessOptions = {
  walletSource?: string;
  walletOfficeId?: string;
  expectedCostPk?: number;
  expectedActorId?: string;
  requestId?: string;
  aciklama?: string;
  channel?: 'CALL' | 'WHATSAPP';
};

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
  landSharePercent?: number | null;
  propertyTypes?: string[] | null;
  roomCounts?: string[] | null;
  features?: string[] | null;
  cardProfileCriteria?: unknown;
  priceCurrency?: string | null;
  allowPhoneCall?: boolean;
  contactPhone?: string | null;
  allowWhatsapp?: boolean;
  whatsappPhone?: string | null;
  acknowledgedWarningCodes?: string[] | null;
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
  landSharePercent?: number | null;
  propertyTypes?: string[] | null;
  roomCounts?: string[] | null;
  features?: string[] | null;
  cardProfileCriteria?: unknown;
  priceCurrency?: string | null;
  allowPhoneCall?: boolean;
  contactPhone?: string | null;
  allowWhatsapp?: boolean;
  whatsappPhone?: string | null;
  acknowledgedWarningCodes?: string[] | null;
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
  if (typeof value === "object") return JSON.stringify(value);
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
  private readonly matchLogger = new Logger(NetworkService.name);
  private requestMatchHandler?: (postId: string, ownerId: string) => Promise<void>;

  registerRequestMatchHandler(handler: (postId: string, ownerId: string) => Promise<void>) {
    this.requestMatchHandler = handler;
  }

  private async refreshRequestMatches(post: { id: string; userId: string; type: string; isActive: boolean; expiresAt: Date }) {
    if (post.type !== "PORTFOY_ARIYORUM" || !post.isActive || post.expiresAt <= new Date()) return;
    try {
      if (!this.requestMatchHandler) throw new Error('Matching handler unavailable');
      await this.requestMatchHandler(post.id, post.userId);
    } catch {
      this.matchLogger.warn('Talep kaydedildi; otomatik eşleştirme tamamlanamadı. Yeniden tarama gerekli.');
    }
  }

  @Inject(AdminService)
  private readonly adminService!: AdminService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly propertyCriteriaService: PropertyCriteriaService,
    private readonly propertyDemandAdapter: PropertyDemandAdapter,
    private readonly propertyValidationService: PropertyValidationService,
    private readonly textSafetyService: TextSafetyService,
  ) {}

  private normalizeContactSettings(input: {
    allowPhoneCall?: boolean | null;
    contactPhone?: string | null;
    allowWhatsapp?: boolean | null;
    whatsappPhone?: string | null;
  }) {
    const allowPhoneCall = Boolean(input.allowPhoneCall);
    const allowWhatsapp = Boolean(input.allowWhatsapp);
    const contactPhone = cleanForumText(input.contactPhone) || null;
    const whatsappPhone = cleanForumText(input.whatsappPhone) || null;

    if (allowPhoneCall && !contactPhone) {
      throw new BadRequestException(
        "Telefonla aranma izni için aranacak telefon numarasını girin.",
      );
    }

    if (allowWhatsapp && !whatsappPhone) {
      throw new BadRequestException(
        "WhatsApp izni için mesaj alınacak telefon numarasını girin.",
      );
    }

    return {
      allowPhoneCall,
      contactPhone: allowPhoneCall ? contactPhone : null,
      allowWhatsapp,
      whatsappPhone: allowWhatsapp ? whatsappPhone : null,
    };
  }

  private async networkPostVisibilityFilter(
    viewerId?: string | null,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<Prisma.NetworkPostWhereInput> {
    const allowed: Prisma.NetworkPostWhereInput[] = [
      { visibility: 'TUM_EPH' },
    ];

    if (!viewerId) return { OR: allowed };

    allowed.push({ userId: viewerId });
    const viewer = await db.user.findUnique({
      where: { id: viewerId },
      select: { role: true },
    });

    const blockScope: Prisma.NetworkPostWhereInput = { User: visibleAuthor(viewerId, viewer?.role) };
    if (viewer?.role === Role.SUPER_ADMIN) return blockScope;

    if (viewer?.role === Role.EMLAKCI) {
      allowed.push({ visibility: 'SADECE_EMLAKCILAR' });
    }
    if (
      viewer?.role === Role.MUTEAHHIT ||
      viewer?.role === Role.INSAAT_FIRMASI
    ) {
      allowed.push({ visibility: 'SADECE_MUTEAHHITLER' });
    }

    return { AND: [{ OR: allowed }, blockScope] };
  }

  private async assertCanViewNetworkPost(
    postId: string,
    viewerId?: string | null,
    options: { ownerOnly?: boolean } = {},
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    if (!viewerId) {
      throw new NotFoundException("Pazaryeri paylaşımı bulunamadı.");
    }
    const visibility = await this.networkPostVisibilityFilter(viewerId, db);
    const manager = options.ownerOnly ? await db.user.findUnique({ where: { id: viewerId }, select: { role: true } }) : null;
    const ownerScope = options.ownerOnly && manager?.role !== Role.SUPER_ADMIN ? [{ userId: viewerId }] : [];
    const post = await db.networkPost.findFirst({
      where: {
        id: postId,
        isActive: true,
        expiresAt: { gt: new Date() },
        AND: [
          visibility,
          ...ownerScope,
        ],
      },
      select: { id: true, userId: true, title: true },
    });
    if (!post) {
      throw new NotFoundException("Pazaryeri paylaşımı bulunamadı.");
    }
    return post;
  }

  private serializeNetworkPostForViewer<T extends Record<string, any>>(
    post: T,
    viewerId?: string | null,
    privateUnlocked = false,
    revealPrivateInfo = false,
  ) {
    const isOwner = Boolean(viewerId && post.userId === viewerId);
    const canSeePrivateInfo = isOwner || privateUnlocked;
    const canRevealPrivateInfo = canSeePrivateInfo && (revealPrivateInfo || isOwner);

    const phoneCallAllowed = Boolean(
      post.allowPhoneCall && networkContactPhone(post.contactPhone),
    );
    const whatsappAllowed = Boolean(
      post.allowWhatsapp && networkContactPhone(post.whatsappPhone),
    );
    const canonicalDemand = this.propertyDemandAdapter.fromNetworkPost(post);
    const { contactPhone, whatsappPhone, User, user, ...safePost } = post;

    const rawUser = User || user;
    const professionalContact = networkProfessionalContact(rawUser);
    const listingOwnerName = professionalContact.name;

    const serializedUser = canRevealPrivateInfo && rawUser
      ? {
          id: rawUser.id,
          firstName: rawUser.role === Role.SUPER_ADMIN ? 'Yazılım Ekibi' : rawUser.firstName,
          lastName: rawUser.role === Role.SUPER_ADMIN ? null : rawUser.lastName,
          role: rawUser.role,
          email: rawUser.role === Role.SUPER_ADMIN ? null : rawUser.email,
        }
      : rawUser
        ? {
            id: canSeePrivateInfo ? rawUser.id : null,
            role: rawUser.role,
          }
        : null;

    return {
      ...safePost,
      userId: canSeePrivateInfo ? post.userId : null,
      listingOwnerLabel: networkOwnerLabel(rawUser?.role, rawUser?.capabilities),
      User: serializedUser,
      user: serializedUser,
      isOwner,
      cardProfileCriteria: canonicalDemand.cardProfileCriteria,
      phoneCallAllowed,
      whatsappAllowed,
      contactPhone: canRevealPrivateInfo && phoneCallAllowed ? networkContactPhone(contactPhone) : null,
      whatsappPhone: canRevealPrivateInfo && whatsappAllowed ? networkContactPhone(whatsappPhone) : null,
      listingOwnerName: canRevealPrivateInfo ? listingOwnerName : null,
      listingOwnerEmail: canRevealPrivateInfo ? professionalContact.email : null,
      listingOwnerPhone: canRevealPrivateInfo ? professionalContact.phone : null,
      listingOfficeName: canRevealPrivateInfo ? professionalContact.officeName : null,
      privateInfoUnlocked: canSeePrivateInfo,
      phoneUnlocked: canSeePrivateInfo,
      whatsappUnlocked: canSeePrivateInfo,
      replyAllowed: canSeePrivateInfo,
    };
  }

  private normalizeNetworkPostCriteria(
    dto: Partial<CreateNetworkPostDto | UpdateNetworkPostDto>,
  ) {
    const criteria = this.propertyCriteriaService.normalize({
      recordKind: "DEMAND",
      source: "REQUEST_CENTER",
      areas: dto.areas,
      city: dto.city,
      district: dto.district,
      neighborhood: dto.neighborhood,
      propertyTypes: dto.propertyTypes,
      minBudget: dto.minBudget,
      maxBudget: dto.maxBudget,
      priceCurrency: dto.priceCurrency,
      minArea: dto.minArea,
      maxArea: dto.maxArea,
      roomCounts: dto.roomCounts,
      features: dto.features,
      isActive: true,
    });

    const exactBudget = this.propertyCriteriaService.normalize({
      recordKind: "DEMAND",
      source: "REQUEST_CENTER",
      price: dto.budget,
      isActive: true,
    }).budget.min;

    return {
      criteria,
      exactBudget,
    };
  }

  private normalizeNetworkDemandPersistence(
    input: Partial<CreateNetworkPostDto | UpdateNetworkPostDto>,
    propertyTypes: unknown,
    roomCounts: unknown,
    features: unknown,
  ) {
    const demand = this.propertyDemandAdapter.fromNetworkPost({
      ...input,
      propertyTypes,
      roomCounts,
      features,
    });

    return {
      features: demand.features,
      cardProfileCriteria: demand.cardProfileCriteria,
    };
  }

  private normalizeLandSharePercent(value: number | null | undefined) {
    if (value === undefined || value === null) return null;

    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100) {
      throw new BadRequestException(
        "Kat karşılığı oranı 0'dan büyük ve 100'den küçük veya eşit olmalıdır.",
      );
    }

    return Math.round(numeric * 100) / 100;
  }

  private validatePropertyDemandInput(
    category: string,
    dto: Partial<CreateNetworkPostDto | UpdateNetworkPostDto>,
  ) {
    if (category !== "PORTFOY_ARIYORUM") {
      return;
    }

    const propertyTypes = this.propertyCriteriaService.normalize({
      recordKind: "DEMAND",
      source: "REQUEST_CENTER",
      propertyTypes: dto.propertyTypes,
      isActive: true,
    }).propertyTypes;

    const result = this.propertyValidationService.validate({
      context: PropertyValidationContext.DEMAND,
      recordKind: "DEMAND",
      source: "REQUEST_CENTER",
      propertyTypes,
      acknowledgedWarningCodes: dto.acknowledgedWarningCodes ?? [],
      values: {
        minArea: dto.minArea,
        maxArea: dto.maxArea,
        minRoom: dto.minRoom,
        maxRoom: dto.maxRoom,
        minBudget: dto.minBudget ?? dto.budget,
        maxBudget: dto.maxBudget ?? dto.budget,
        roomCounts: dto.roomCounts,
      },
    });

    if (!result.valid) {
      const blockingIssues = result.issues.filter(
        (issue) => issue.blocking,
      );

      throw new BadRequestException({
        code: "PROPERTY_VALIDATION_FAILED",
        validationVersion: result.version,
        requiresConfirmation: false,
        message:
          blockingIssues[0]?.message ||
          "Gayrimenkul kriterlerinde geçersiz değerler bulunmaktadır.",
        issues: blockingIssues,
      });
    }

    if (result.requiresConfirmation) {
      const firstWarning = result.pendingWarnings[0];

      throw new BadRequestException({
        code: "PROPERTY_VALIDATION_CONFIRMATION_REQUIRED",
        validationVersion: result.version,
        requiresConfirmation: true,
        message:
          firstWarning?.message ||
          "Olağan dışı gayrimenkul kriterleri için kullanıcı onayı gereklidir.",
        linaTitle:
          firstWarning?.metadata?.linaTitle ||
          "Lina olağan dışı bir değer fark etti",
        confirmationText:
          firstWarning?.metadata?.confirmationText ||
          "Bu değerin doğru olduğunu onaylıyorum",
        requiredWarningCodes:
          result.requiredWarningCodes,
        acknowledgedWarningCodes:
          result.acknowledgedWarningCodes,
        warnings: result.pendingWarnings,
        issues: result.pendingWarnings,
      });
    }
  }

  preparePropertyDemandPreview(
    dto: Pick<
      CreateNetworkPostDto,
      | "areas"
      | "propertyTypes"
      | "roomCounts"
      | "features"
      | "cardProfileCriteria"
      | "priceCurrency"
      | "maxBudget"
      | "minArea"
      | "acknowledgedWarningCodes"
    >,
    requestType: string,
  ) {
    const normalizedRequestType = normalizeForumRequestType(requestType);
    const allowedRequestTypes =
      FORUM_REQUEST_TYPES_BY_CATEGORY.PORTFOY_ARIYORUM;

    if (!allowedRequestTypes.includes(normalizedRequestType)) {
      throw new BadRequestException(
        "Talep türü PORTFOY_SATILIK veya PORTFOY_KIRALIK olmalıdır.",
      );
    }

    this.validatePropertyDemandInput("PORTFOY_ARIYORUM", dto);

    const { criteria } = this.normalizeNetworkPostCriteria(dto);
    const canonicalDemand = this.propertyDemandAdapter.fromNetworkPost({
      ...dto,
      propertyTypes: criteria.propertyTypes,
      roomCounts: criteria.roomCounts,
      features: criteria.features,
    });

    if (criteria.areas.length === 0) {
      throw new BadRequestException("En az bir hedef bölge seçilmelidir.");
    }

    const cities = new Set(
      criteria.areas.map((area) =>
        area.city.trim().toLocaleLowerCase("tr-TR"),
      ),
    );

    if (cities.size !== 1) {
      throw new BadRequestException(
        "Tek talepte yalnız bir İl/Şehir seçilebilir.",
      );
    }

    return {
      criteria,
      cardProfileCriteria: canonicalDemand.cardProfileCriteria,
      requestType: normalizedRequestType,
    };
  }

  private async validateForumPostInput(
    dto: CreateNetworkPostDto | UpdateNetworkPostDto,
    mode: "create" | "update",
    permissionUserId?: string,
  ) {
    const userId = cleanForumText(dto.userId);

    if (!userId) {
      throw new BadRequestException(
        "Kullanıcı bilgisi olmadan Talep Merkezi kaydı oluşturulamaz.",
      );
    }

    const permissionUser = await this.prisma.user.findUnique({
      where: { id: cleanForumText(permissionUserId) || userId },
      select: { id: true, role: true },
    });

    if (!permissionUser) {
      throw new BadRequestException("Talep Merkezi kaydı için kullanıcı bulunamadı.");
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

    const titleSafety =
      this.textSafetyService.validatePublicTitle(title);

    if (!titleSafety.valid) {
      throw new BadRequestException({
        code: "TEXT_SAFETY_FAILED",
        message:
          titleSafety.errors[0]?.message ||
          "Talep başlığı güvenlik kontrolünden geçemedi.",
        issues: titleSafety.errors,
      });
    }

    const descriptionSafety =
      this.textSafetyService.validatePublicDescription(
        description,
      );

    if (!descriptionSafety.valid) {
      throw new BadRequestException({
        code: "TEXT_SAFETY_FAILED",
        message:
          descriptionSafety.errors[0]?.message ||
          "Talep açıklaması güvenlik kontrolünden geçemedi.",
        issues: descriptionSafety.errors,
      });
    }

    const normalizedLocation =
      this.normalizeNetworkPostCriteria(dto).criteria.areas;

    if (requiresForumCity(category) && normalizedLocation.length === 0) {
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

  async findAll(viewerId?: string | null) {
    const now = new Date();
    const visibilityFilter = await this.networkPostVisibilityFilter(viewerId);

    const [posts, unlockedPostIds] = await Promise.all([
      this.prisma.networkPost.findMany({
        where: {
          AND: [visibilityFilter],
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
              capabilities: { select: { capability: true } },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.getUnlockedPostIdsForViewer(viewerId),
    ]);

    const isSuper = unlockedPostIds.has("*");

    return posts.slice().sort((a, b) => {
      const aUrgent = String(a.urgency || "").toUpperCase() === "ACIL" && (!a.expiresAt || a.expiresAt.getTime() > now.getTime()) ? 1 : 0;
      const bUrgent = String(b.urgency || "").toUpperCase() === "ACIL" && (!b.expiresAt || b.expiresAt.getTime() > now.getTime()) ? 1 : 0;
      if (aUrgent !== bUrgent) return bUrgent - aUrgent;
      return b.createdAt.getTime() - a.createdAt.getTime();
    }).map((post) =>
      this.serializeNetworkPostForViewer(
        post,
        viewerId,
        isSuper || unlockedPostIds.has(post.id),
      ),
    );
  }

  async getDemandDensity(viewerId: string) {
    const now = new Date();
    const visibilityFilter = await this.networkPostVisibilityFilter(viewerId);

    const posts = await this.prisma.networkPost.findMany({
      where: {
        type: "PORTFOY_ARIYORUM",
        AND: [visibilityFilter],
        isActive: true,
        expiresAt: {
          gt: now,
        },
      },
      select: {
        id: true,
        city: true,
        district: true,
        neighborhood: true,
        areas: true,
      },
    });

    type NeighborhoodBucket = {
      neighborhood: string;
      postIds: Set<string>;
    };

    type DistrictBucket = {
      district: string;
      postIds: Set<string>;
      neighborhoods: Map<string, NeighborhoodBucket>;
    };

    type CityBucket = {
      city: string;
      postIds: Set<string>;
      districts: Map<string, DistrictBucket>;
    };

    const cities = new Map<string, CityBucket>();

    const clean = (value: unknown) =>
      String(value ?? "").trim();

    const normalizeKey = (value: string) =>
      value.toLocaleLowerCase("tr-TR");

    const addArea = (
      postId: string,
      cityValue: unknown,
      districtValue: unknown,
      neighborhoodValue: unknown,
    ) => {
      const city = clean(cityValue);
      const district = clean(districtValue);
      const neighborhood = clean(neighborhoodValue);

      if (!city) return;

      const cityKey = normalizeKey(city);

      let cityBucket = cities.get(cityKey);

      if (!cityBucket) {
        cityBucket = {
          city,
          postIds: new Set<string>(),
          districts: new Map<string, DistrictBucket>(),
        };
        cities.set(cityKey, cityBucket);
      }

      cityBucket.postIds.add(postId);

      if (!district) return;

      const districtKey = normalizeKey(district);

      let districtBucket = cityBucket.districts.get(districtKey);

      if (!districtBucket) {
        districtBucket = {
          district,
          postIds: new Set<string>(),
          neighborhoods: new Map<string, NeighborhoodBucket>(),
        };
        cityBucket.districts.set(districtKey, districtBucket);
      }

      districtBucket.postIds.add(postId);

      if (!neighborhood) return;

      const neighborhoodKey = normalizeKey(neighborhood);

      let neighborhoodBucket =
        districtBucket.neighborhoods.get(neighborhoodKey);

      if (!neighborhoodBucket) {
        neighborhoodBucket = {
          neighborhood,
          postIds: new Set<string>(),
        };
        districtBucket.neighborhoods.set(
          neighborhoodKey,
          neighborhoodBucket,
        );
      }

      neighborhoodBucket.postIds.add(postId);
    };

    for (const post of posts) {
      const rawAreas = Array.isArray(post.areas)
        ? post.areas
        : [];

      const seenAreas = new Set<string>();
      let hasUsableArea = false;

      for (const rawArea of rawAreas) {
        if (
          !rawArea ||
          typeof rawArea !== "object" ||
          Array.isArray(rawArea)
        ) {
          continue;
        }

        const area = rawArea as Record<string, unknown>;

        const city =
          clean(area.city) || clean(post.city);

        const district =
          clean(area.district) || clean(post.district);

        const neighborhood =
          clean(area.neighborhood);

        if (!city) continue;

        const areaKey = [
          normalizeKey(city),
          normalizeKey(district),
          normalizeKey(neighborhood),
        ].join("|");

        if (seenAreas.has(areaKey)) continue;

        seenAreas.add(areaKey);
        hasUsableArea = true;

        addArea(
          post.id,
          city,
          district,
          neighborhood,
        );
      }

      if (!hasUsableArea) {
        addArea(
          post.id,
          post.city,
          post.district,
          post.neighborhood,
        );
      }
    }

    const resultCities = Array.from(cities.values())
      .map((cityBucket) => ({
        city: cityBucket.city,
        activeDemandCount: cityBucket.postIds.size,
        districts: Array.from(cityBucket.districts.values())
          .map((districtBucket) => ({
            district: districtBucket.district,
            activeDemandCount: districtBucket.postIds.size,
            neighborhoods: Array.from(
              districtBucket.neighborhoods.values(),
            )
              .map((neighborhoodBucket) => ({
                neighborhood:
                  neighborhoodBucket.neighborhood,
                activeDemandCount:
                  neighborhoodBucket.postIds.size,
              }))
              .sort(
                (a, b) =>
                  b.activeDemandCount -
                    a.activeDemandCount ||
                  a.neighborhood.localeCompare(
                    b.neighborhood,
                    "tr",
                  ),
              ),
          }))
          .sort(
            (a, b) =>
              b.activeDemandCount -
                a.activeDemandCount ||
              a.district.localeCompare(
                b.district,
                "tr",
              ),
          ),
      }))
      .sort(
        (a, b) =>
          b.activeDemandCount -
            a.activeDemandCount ||
          a.city.localeCompare(b.city, "tr"),
      );

    return {
      totalActiveDemands: posts.length,
      cities: resultCities,
    };
  }

  async lookupListing(number: string, viewerId?: string | null) {
    const parsed = parseListingNumberOrId(number);
    if (!viewerId) throw new NotFoundException('İlan bulunamadı.');
    const visibility = await this.networkPostVisibilityFilter(viewerId);
    const whereCondition = parsed.type === 'UUID'
      ? { id: parsed.value, AND: [visibility] }
      : { listingNumber: parsed.value, AND: [visibility] };
    const post = await this.prisma.networkPost.findFirst({
      where: whereCondition,
      select: { id: true, listingNumber: true, isActive: true, expiresAt: true },
    });
    if (!post) throw new NotFoundException('İlan bulunamadı.');
    return {
      id: post.id,
      status: post.isActive && post.expiresAt > new Date() ? 'ACTIVE' : 'PASSIVE',
      ...(post.listingNumber ? { listingNumber: post.listingNumber } : {}),
    };
  }

  async findOne(id: string, viewerId?: string | null) {
    const visibilityFilter = await this.networkPostVisibilityFilter(viewerId);
    let targetWhere: Record<string, unknown> = { id };
    try {
      const parsed = parseListingNumberOrId(id);
      if (parsed.type === 'LISTING_NUMBER') {
        targetWhere = { listingNumber: parsed.value };
      } else {
        targetWhere = { id: parsed.value };
      }
    } catch {
      targetWhere = { id };
    }
    const post = await this.prisma.networkPost.findFirst({
      where: {
        AND: [visibilityFilter],
        ...targetWhere,
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            capabilities: { select: { capability: true } },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException("Pazaryeri paylaşımı bulunamadı.");
    }

    if (!post.isActive || post.expiresAt <= new Date()) throw new NotFoundException('Bu ilan pasiftir. Detayları görüntülenemez.');

    const hasAccess = viewerId
      ? await this.hasPostPrivateAccess(post.id, viewerId, post.userId)
      : false;

    return this.serializeNetworkPostForViewer(post, viewerId, hasAccess);
  }

  async createNetworkPostShareLink(id: string, actionUserId: string) {
    const actor = await this.prisma.user.findUnique({ where: { id: actionUserId }, select: { role: true } });
    const post = await this.prisma.networkPost.findFirst({
      where: {
        id,
        ...(actor?.role === Role.SUPER_ADMIN ? {} : { userId: actionUserId }),
        visibility: 'TUM_EPH',
        isActive: true,
        expiresAt: { gt: new Date() },
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
        visibility: 'TUM_EPH',
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (!post) {
      throw new NotFoundException("Bu talep artık aktif değil.");
    }

    const sharedBy = await this.prisma.user.findUnique({ where: { id: shareLink.sharedById }, select: { role: true, capabilities: { select: { capability: true } } } });

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
            fullName: networkOwnerLabel(sharedBy.role, sharedBy.capabilities),
            phone: null,
          }
        : null,
    };
  }

  async getPostStats(id: string, userId: string) {
    const post = await this.assertCanViewNetworkPost(id, userId, { ownerOnly: true });
    const viewer = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

    const conversations = await this.prisma.conversation.findMany({
      where: {
        postId: id,
        ...(viewer?.role === Role.SUPER_ADMIN ? {} : { ConversationParticipant: { some: { userId } } }),
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
                capabilities: { select: { capability: true } },
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
                capabilities: { select: { capability: true } },
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
    await this.assertCanViewNetworkPost(id, userId);
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

  async getUpdateLogs(id: string, userId: string) {
    await this.assertCanViewNetworkPost(id, userId, { ownerOnly: true });
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
    await this.assertCanViewNetworkPost(id, userId);
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
    await this.assertCanViewNetworkPost(id, userId);
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
    await this.assertCanViewNetworkPost(id, userId);
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
    const visibility = await this.networkPostVisibilityFilter(userId);

    const follows = await this.prisma.networkPostFollower.findMany({
      where: {
        userId,
        post: {
          AND: [visibility],
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
                capabilities: { select: { capability: true } },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const unlockedPostIds = await this.getUnlockedPostIdsForViewer(userId);
    const isSuper = unlockedPostIds.has("*");

    return follows.map((follow) => ({
      id: follow.id,
      followedAt: follow.createdAt,
      post: this.serializeNetworkPostForViewer(
        follow.post,
        userId,
        isSuper || unlockedPostIds.has(follow.post.id),
      ),
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
          OR: [{ type: 'NETWORK' }, { postId: { not: null } }],
          isRead: false,
        },
      }),
      this.prisma.networkNotification.findMany({
        where: {
          userId,
          OR: [{ type: 'NETWORK' }, { postId: { not: null } }],
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
        OR: [{ type: 'NETWORK' }, { postId: { not: null } }],
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
    const blocked = await blockedPeerIds(this.prisma, ownerId);

    const followers = await this.prisma.networkPostFollower.findMany({
      where: {
        postId,
        userId: {
          not: ownerId,
          notIn: blocked,
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

  async getPostFollowers(id: string, userId: string) {
    await this.assertCanViewNetworkPost(id, userId, { ownerOnly: true });
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

  async getFeaturedPosts(viewerId: string) {
    const now = new Date();
    const visibility = await this.networkPostVisibilityFilter(viewerId);

    const [posts, unlockedPostIds] = await Promise.all([
      this.prisma.networkPost.findMany({
        where: {
          AND: [visibility],
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
              capabilities: { select: { capability: true } },
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
      }),
      this.getUnlockedPostIdsForViewer(viewerId),
    ]);

    const isSuper = unlockedPostIds.has("*");

    return posts
      .map((post) => {
        const canSee = isSuper || unlockedPostIds.has(post.id) || (viewerId && post.userId === viewerId);
        const serialized = this.serializeNetworkPostForViewer(post, viewerId, canSee);
        return {
          id: post.id,
          title: post.title,
          type: post.type,
          city: post.city,
          district: post.district,
          budget: post.budget,
          createdAt: post.createdAt,
          user: serialized.user,
          User: serialized.User,
          score:
            post._count.views +
            post._count.followers * 5 +
            post._count.Conversation * 8,
          viewCount: post._count.views,
          followerCount: post._count.followers,
          requestCount: post._count.Conversation,
        };
      })
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

  private async requireForumModerationPermission(actionUser: { id: string; role: Role }) {
    if (actionUser.role === Role.ADMIN || actionUser.role === Role.SUPER_ADMIN) {
      const permission = await this.adminService.resolveOperationalPermission(actionUser, "FORUM_MODERATE");
      if (!permission.enabled) {
        throw new ForbiddenException("Forum moderasyon yetkiniz bulunmuyor.");
      }
    }
  }

  async update(id: string, dto: UpdateNetworkPostDto, actionUserId: string) {
    const actionUser = await this.getNetworkActionUser(actionUserId);
    await this.requireForumModerationPermission(actionUser);
    const existing = await this.prisma.networkPost.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Pazaryeri paylaşımı bulunamadı.");
    }

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

    this.validatePropertyDemandInput(validated.category, {
      ...dto,
      userId: existing.userId,
      type: dto.type ?? existing.type,
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description,
      city: dto.city ?? existing.city,
      district: dto.district ?? existing.district,
      neighborhood: dto.neighborhood ?? existing.neighborhood,
      budget: dto.budget ?? existing.budget,
      minArea: dto.minArea ?? existing.minArea,
      maxArea: dto.maxArea ?? existing.maxArea,
      minBudget: dto.minBudget ?? existing.minBudget,
      maxBudget: dto.maxBudget ?? existing.maxBudget,
      propertyTypes: dto.propertyTypes ?? existing.propertyTypes,
      roomCounts: dto.roomCounts ?? existing.roomCounts,
      features: dto.features ?? existing.features,
      priceCurrency: dto.priceCurrency ?? existing.priceCurrency,
      areas:
        dto.areas ??
        (Array.isArray(existing.areas)
          ? (existing.areas as CreateNetworkPostDto["areas"])
          : null),
    });

    const { criteria, exactBudget } =
      this.normalizeNetworkPostCriteria({
        ...dto,
        userId: existing.userId,
        type: dto.type ?? existing.type,
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        city: dto.city ?? existing.city,
        district: dto.district ?? existing.district,
        neighborhood: dto.neighborhood ?? existing.neighborhood,
        budget: dto.budget ?? existing.budget,
        minArea: dto.minArea ?? existing.minArea,
        maxArea: dto.maxArea ?? existing.maxArea,
        minBudget: dto.minBudget ?? existing.minBudget,
        maxBudget: dto.maxBudget ?? existing.maxBudget,
        propertyTypes: dto.propertyTypes ?? existing.propertyTypes,
        roomCounts: dto.roomCounts ?? existing.roomCounts,
        features: dto.features ?? existing.features,
        priceCurrency: dto.priceCurrency ?? existing.priceCurrency,
        areas:
          dto.areas ??
          (Array.isArray(existing.areas)
            ? (existing.areas as CreateNetworkPostDto["areas"])
            : null),
      });
    const demandPersistence = this.normalizeNetworkDemandPersistence(
      {
        ...dto,
        type: validated.category,
        cardProfileCriteria:
          dto.cardProfileCriteria !== undefined
            ? dto.cardProfileCriteria
            : dto.features !== undefined || dto.propertyTypes !== undefined
              ? undefined
              : existing.cardProfileCriteria,
      },
      criteria.propertyTypes,
      criteria.roomCounts,
      criteria.features,
    );
    const primaryArea = criteria.areas[0] ?? null;
    const contactSettings = this.normalizeContactSettings({
      allowPhoneCall:
        dto.allowPhoneCall ?? existing.allowPhoneCall,
      contactPhone:
        dto.contactPhone ?? existing.contactPhone,
      allowWhatsapp:
        dto.allowWhatsapp ?? existing.allowWhatsapp,
      whatsappPhone:
        dto.whatsappPhone ?? existing.whatsappPhone,
    });

    const nextData = {
      type: validated.category,
      title: dto.title ? validated.title : existing.title,
      description: dto.description
        ? validated.description
        : existing.description,
      city: primaryArea?.city ?? existing.city,
      district: primaryArea?.district ?? existing.district,
      neighborhood: primaryArea?.neighborhood ?? existing.neighborhood,
      budget: exactBudget,
      minArea: criteria.grossArea.min,
      maxArea: criteria.grossArea.max,
      minRoom: dto.minRoom ?? existing.minRoom,
      maxRoom: dto.maxRoom ?? existing.maxRoom,
      minBudget: criteria.budget.min,
      maxBudget: criteria.budget.max,
      landSharePercent:
        dto.landSharePercent === undefined
          ? existing.landSharePercent
          : this.normalizeLandSharePercent(dto.landSharePercent),
      propertyTypes: criteria.propertyTypes,
      roomCounts: criteria.roomCounts,
      features: demandPersistence.features,
      cardProfileCriteria: demandPersistence.cardProfileCriteria
        ? (demandPersistence.cardProfileCriteria as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
      priceCurrency: criteria.priceCurrency,
      ...contactSettings,
      ...(criteria.areas.length > 0
        ? {
            areas: criteria.areas as unknown as Prisma.InputJsonValue,
          }
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
      { field: "propertyTypes", label: "Gayrimenkul tipleri" },
      { field: "roomCounts", label: "Oda seçenekleri" },
      { field: "features", label: "Gayrimenkul özellikleri" },
      { field: "cardProfileCriteria", label: "Kart kriterleri" },
      { field: "priceCurrency", label: "Para birimi" },
      { field: "allowPhoneCall", label: "Telefonla aranma izni" },
      { field: "allowWhatsapp", label: "WhatsApp izni" },
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
            capabilities: { select: { capability: true } },
          },
        },
      },
    });

    await this.refreshRequestMatches(updatedPost);

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

    return this.serializeNetworkPostForViewer(
      updatedPost,
      actionUser.id,
    );
  }

  async remove(id: string, userId: string) {
    const actionUser = await this.getNetworkActionUser(userId);
    await this.requireForumModerationPermission(actionUser);
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

    this.validatePropertyDemandInput(validated.category, dto);

    const { criteria, exactBudget } =
      this.normalizeNetworkPostCriteria(dto);
    const demandPersistence = this.normalizeNetworkDemandPersistence(
      { ...dto, type: validated.category },
      criteria.propertyTypes,
      criteria.roomCounts,
      criteria.features,
    );
    const primaryArea = criteria.areas[0] ?? null;
    const contactSettings = this.normalizeContactSettings(dto);

    // Varsayılan talep geçerlilik süresi §0-B gereği SystemSetting'ten okunur (TALEP_GECERLILIK_GUN).
    const defaultValidityDays = dto.expiresAt ? 0 : await this.getRequestValidityDays();

    const MAX_COLLISION_RETRIES = 5;
    let result: any;
    for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
      const candidateListingNumber = generateRequestListingNumber();
      try {
        result = await this.prisma.$transaction(async (tx) => {
          await consumeMembershipQuota(tx, actionUserId, 'TALEP');
          const post = await tx.networkPost.create({
            data: {
              id: randomUUID(),
              listingNumber: candidateListingNumber,
              userId: actionUserId,
              type: validated.category,
              title: validated.title,
              description: validated.description,
              city: primaryArea?.city || null,
              district: primaryArea?.district || null,
              neighborhood: primaryArea?.neighborhood || null,
              budget: exactBudget,
              minArea: criteria.grossArea.min,
              maxArea: criteria.grossArea.max,
              minRoom: dto.minRoom ?? null,
              maxRoom: dto.maxRoom ?? null,
              minBudget: criteria.budget.min,
              maxBudget: criteria.budget.max,
              landSharePercent: this.normalizeLandSharePercent(dto.landSharePercent),
              areas:
                criteria.areas.length > 0
                  ? (criteria.areas as unknown as Prisma.InputJsonValue)
                  : undefined,
              propertyTypes: criteria.propertyTypes,
              roomCounts: criteria.roomCounts,
              features: demandPersistence.features,
              cardProfileCriteria: demandPersistence.cardProfileCriteria
                ? (demandPersistence.cardProfileCriteria as unknown as Prisma.InputJsonValue)
                : undefined,
              priceCurrency: criteria.priceCurrency,
              ...contactSettings,
              urgency: dto.urgency || "Normal",
              visibility: (dto.visibility as any) || "TUM_EPH",
              tags: buildForumTags(
                validated.category,
                validated.requestType,
                dto.tags,
              ),
              expiresAt: dto.expiresAt
                ? new Date(dto.expiresAt)
                : new Date(Date.now() + defaultValidityDays * 24 * 60 * 60 * 1000),
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
                  capabilities: { select: { capability: true } },
                },
              },
            },
          });

          const isUrgent = String(dto.urgency || "").toUpperCase() === "ACIL";
          const baseCost = await readCost(tx, "COST_TALEP_YAYIN");
          const urgentExtra = isUrgent ? await readCost(tx, "COST_TALEP_ACIL_EK") : 0;
          const kontorAmount = baseCost + urgentExtra;
          const kontorAciklama = isUrgent
            ? `Talep Merkezi acil talep yayınlama bedeli: ${kontorAmount} PK (${baseCost} PK taban + ${urgentExtra} PK aciliyet).`
            : `Talep Merkezi talep yayınlama bedeli: ${kontorAmount} PK.`;

          const payment = await this.spendForumKontor(tx, {
            userId: actionUserId,
            amount: kontorAmount,
            islemTuru: KontorIslemTuru.FORUM_TALEP_OLUSTURMA,
            aciklama: kontorAciklama,
            postId: post.id,
          });

          return {
            ...this.serializeNetworkPostForViewer(post, actionUserId),
            id: post.id as string,
            userId: post.userId as string,
            type: post.type as string,
            isActive: post.isActive as boolean,
            expiresAt: post.expiresAt as Date,
            listingNumber: post.listingNumber,
            publicationReceipt: {
              ok: true as const,
              postId: post.id,
              actorId: actionUserId,
              operationId: payment.movement.id,
              spent: payment.movement.miktar,
              previousBalance: payment.movement.oncekiBakiye,
              remainingBalance: payment.wallet.bakiye,
              walletSource: payment.walletSource,
              walletOfficeId: payment.walletOfficeId,
              replayed: false as const,
            },
          };
        });
        break;
      } catch (err: any) {
        const isP2002 =
          err instanceof Prisma.PrismaClientKnownRequestError || err?.code === 'P2002';
        const target = (err?.meta as any)?.target;
        const targetMatchesListingNumber =
          Array.isArray(target) ? target.includes('listingNumber') : String(target || '').includes('listingNumber');

        const isListingNumberUniqueError =
          (isP2002 && targetMatchesListingNumber) ||
          Boolean(err?.isListingNumberCollision);

        if (isListingNumberUniqueError && attempt < MAX_COLLISION_RETRIES - 1) {
          continue;
        }
        throw err;
      }
    }
    if (!result) {
      throw new BadRequestException('Talep ilan numarası tahsis edilemedi. Lütfen tekrar deneyin.');
    }
    await this.refreshRequestMatches(result);
    return result;
  }

  async getRequestValidityDays(): Promise<number> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: "TALEP_GECERLILIK_GUN" }, select: { valueJson: true } });
    const days = row ? parseCostValue(row.valueJson) : null;
    if (days === null || days < 1) {
      throw new BadRequestException("Talep geçerlilik süresi tanımlı değil, yöneticinize başvurun.");
    }
    return days;
  }

  private getForumActionUserId(user?: CurrentUserPayload): string {
    const userId = String(user?.id || user?.sub || "").trim();

    if (!userId) {
      throw new ForbiddenException(
        "Talep Merkezi işlemi için kullanıcı kimliği doğrulanamadı.",
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

    await this.assertCanViewNetworkPost(postId, actorId, {}, tx);
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
        "Aktif Talep Merkezi kaydı bulunamadı.",
      );
    }

    if (!actor) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    if (post.userId === actorId) {
      throw new BadRequestException(
        "Kendi Talep Merkezi kaydınız için bu işlemi yapamazsınız.",
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
      actorId?: string;
      walletSource?: string;
      walletOfficeId?: string;
      amount: number;
      islemTuru: KontorIslemTuru;
      aciklama: string;
      postId: string;
    },
  ) {
    const actorId = input.actorId || input.userId;
    const selected = await resolveOfficeWallet(tx, actorId, { walletSource: input.walletSource, walletOfficeId: input.walletOfficeId }, true);
    if (input.actorId && selected.chargeUserId !== input.userId) throw new BadRequestException('Ofis harcama hesabı değişti; ücreti yeniden kontrol edin.');
    input = { ...input, userId: selected.chargeUserId, actorId };
    await lockWallet(tx, input.userId); // EPH-70B1F: ortak kilit sırası + atomik dönem sonu kapanışı

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
        bakiye: {
            decrement: input.amount,
          },
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
        olusturanId: input.actorId || input.userId,
      },
    });
    await consumeLots(tx, input.userId, input.amount, { hareketId: movement.id }); // EPH-70B1F/D1

    return {
      wallet: updatedWallet,
      movement,
      walletSource: selected.walletSource,
      walletOfficeId: selected.walletOfficeId,
    };
  }

  async getRequestAccessCost(tx?: Prisma.TransactionClient | PrismaService): Promise<number> {
    const db = tx || this.prisma;
    const setting = (await db.systemSetting.findUnique({ where: { key: "COST_OZEL_BILGI" } }))
      ?? (await db.systemSetting.findUnique({ where: { key: "REQUEST_PRIVATE_INFO_COST" } }));
    if (!setting || setting.valueJson === null || setting.valueJson === undefined) return 25;
    const value = typeof setting.valueJson === 'number' || typeof setting.valueJson === 'string' ? Number(setting.valueJson) : NaN;
    if (!Number.isSafeInteger(value) || value <= 0 || value > 2147483647) {
      throw new BadRequestException('İletişim tarifesi doğrulanamadı.');
    }
    return value;
  }

  async hasPostPrivateAccess(
    postId: string, viewerId: string, postOwnerId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<boolean> {
    if (!viewerId) return false;
    if (viewerId === postOwnerId) return true;
    const viewer = await tx.user.findUnique({ where: { id: viewerId }, select: { role: true } });
    if (viewer?.role === Role.SUPER_ADMIN) return true;
    return Boolean(await tx.kontorHareketi.findFirst({ where: networkPaidAccessWhere(viewerId, postId), select: { id: true } }));
  }

  async getUnlockedPostIdsForViewer(viewerId?: string | null): Promise<Set<string>> {
    if (!viewerId) return new Set();
    const viewer = await this.prisma.user.findUnique({ where: { id: viewerId }, select: { role: true } });
    if (viewer?.role === Role.SUPER_ADMIN) return new Set(['*']);
    const records = await this.prisma.kontorHareketi.findMany({ where: networkPaidAccessWhere(viewerId), select: { ilgiliKayitId: true } });
    return new Set(records.map(record => record.ilgiliKayitId).filter((id): id is string => Boolean(id)));
  }

  private assertNetworkActor(actorId: string, options?: NetworkAccessOptions) {
    if (options?.expectedActorId !== undefined && options.expectedActorId !== actorId) {
      throw new ForbiddenException('Oturum değişti. İşlemi yeniden açın.');
    }
  }

  private async networkWalletContext(
    actorId: string, options: NetworkAccessOptions = {},
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const value = await resolveOfficeWallet(tx, actorId, options, tx !== this.prisma);
    return { chargeUserId: value.chargeUserId, walletOfficeId: value.walletOfficeId };
  }

  async getContactQuote(postId: string, user: CurrentUserPayload, query?: NetworkAccessOptions) {
    const actorId = this.getForumActionUserId(user);
    this.assertNetworkActor(actorId, query);
    await this.assertCanViewNetworkPost(postId, actorId);
    const post = await this.prisma.networkPost.findFirst({
      where: { id: postId, isActive: true, expiresAt: { gt: new Date() } },
      select: { id: true, userId: true, allowPhoneCall: true, contactPhone: true, allowWhatsapp: true, whatsappPhone: true, User: { select: NETWORK_CONTACT_OWNER_SELECT } },
    });
    if (!post) throw new NotFoundException('Aktif Talep Merkezi kaydı bulunamadı.');
    const professionalContact = networkProfessionalContact(post.User);
    const alreadyUnlocked = await this.hasPostPrivateAccess(postId, actorId, post.userId);
    const context = await this.networkWalletContext(actorId, query);
    const wallet = await this.prisma.kontorCuzdani.findUnique({ where: { kullaniciId: context.chargeUserId } });
    const tariffCostPk = await this.getRequestAccessCost();
    const costPk = alreadyUnlocked ? 0 : tariffCostPk;
    return {
      costPk, tariffCostPk, alreadyUnlocked, balance: wallet?.bakiye ?? 0,
      eligible: alreadyUnlocked || Boolean(wallet?.aktifMi && wallet.bakiye >= costPk),
      phoneCallAllowed: Boolean(post.allowPhoneCall && networkContactPhone(post.contactPhone)),
      whatsappAllowed: Boolean(post.allowWhatsapp && networkContactPhone(post.whatsappPhone)),
      availableInfo: {
        name: Boolean(professionalContact.name),
        phone: Boolean(professionalContact.phone || (post.allowPhoneCall && networkContactPhone(post.contactPhone))),
        office: Boolean(professionalContact.officeName),
        email: Boolean(professionalContact.email),
      },
    };
  }

  async unlockPostUnifiedAccess(
    postId: string,
    actorId: string,
    options?: NetworkAccessOptions,
    clientTx?: Prisma.TransactionClient,
  ) {
    const runInTx = async (tx: Prisma.TransactionClient) => {
      this.assertNetworkActor(actorId, options);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'network-access:' + actorId + ':' + postId}))`;
      await this.assertCanViewNetworkPost(postId, actorId, {}, tx);

      const post = await tx.networkPost.findFirst({
        where: {
          id: postId,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        include: {
          User: {
            select: NETWORK_CONTACT_OWNER_SELECT,
          },
        },
      });

      if (!post) {
        throw new NotFoundException("Aktif Talep Merkezi kaydı bulunamadı.");
      }

      if (options?.channel) {
        const allowed = options.channel === 'CALL' ? post.allowPhoneCall : post.allowWhatsapp;
        const phone = networkContactPhone(options.channel === 'CALL' ? post.contactPhone : post.whatsappPhone);
        if (!allowed || !phone) throw new ForbiddenException('Talep sahibinin bu kanal için geçerli iletişim izni yok.');
      }
      const { chargeUserId, walletOfficeId } = await this.networkWalletContext(actorId, options, tx);
      const isOwner = post.userId === actorId;
      const alreadyUnlocked = await this.hasPostPrivateAccess(
        postId,
        actorId,
        post.userId,
        tx,
      );

      const tariffCost = await this.getRequestAccessCost(tx);

      if (isOwner || alreadyUnlocked) {
        const wallet = await tx.kontorCuzdani.findUnique({
          where: { kullaniciId: chargeUserId },
        });
        return {
          post,
          alreadyUnlocked: true,
          cost: 0,
          tariffCostPk: tariffCost,
          spent: 0,
          balance: wallet?.bakiye ?? 0,
          operationId: null,
          walletOfficeId,
        };
      }

      if (!Number.isSafeInteger(options?.expectedCostPk) || options?.expectedCostPk !== tariffCost) {
        throw new BadRequestException('Güncel iletişim ücretini yeniden onaylayın.');
      }
      const cost = tariffCost;
      const spendResult = await this.spendForumKontor(tx, {
        userId: chargeUserId,
        walletSource: options?.walletSource,
        walletOfficeId: options?.walletOfficeId,
        actorId,
        amount: cost,
        islemTuru: KontorIslemTuru.FORUM_OZEL_BILGI,
        aciklama:
          options?.aciklama ||
          `${post.title} talebi için özel bilgi ve yanıt erişimi açıldı.`,
        postId: post.id,
      });

      const actor = await tx.user.findUnique({
        where: { id: actorId },
        select: { firstName: true, lastName: true },
      });
      const actorName = actor
        ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim()
        : "Bir kullanıcı";

      await tx.networkNotification.create({
        data: {
          userId: post.userId,
          postId: post.id,
          title: "Talebiniz için özel erişim açıldı",
          type: 'CONTACT_UNLOCKED', priority: 'BILGI', actionUrl: `/network/${post.id}`,
          eventKey: `contact:${spendResult.movement.id}`, pushStatus: 'PENDING',
          message: `${actorName}, "${post.title}" paylaşımınız için özel bilgilerinize erişti.`,
        },
      });

      return {
        post,
        alreadyUnlocked: false,
        cost,
        tariffCostPk: cost,
        spent: cost,
        balance: spendResult.wallet.bakiye,
        operationId: spendResult.movement.id,
        walletOfficeId,
      };
    };

    if (clientTx) {
      return runInTx(clientTx);
    }
    return this.prisma.$transaction(runInTx);
  }

  async postContact(postId: string, user: CurrentUserPayload, channelInput: string, body?: NetworkAccessOptions) {
    const actorId = this.getForumActionUserId(user);
    const channel = String(channelInput || '').trim().toUpperCase();
    if (channel !== 'CALL' && channel !== 'WHATSAPP') throw new BadRequestException('Geçersiz iletişim kanalı.');
    return this.prisma.$transaction(async tx => {
      const unlock = await this.unlockPostUnifiedAccess(postId, actorId, {
        ...body, channel,
        aciklama: `${channel === 'CALL' ? 'Telefon' : 'WhatsApp'} iletişimi ve yanıt hakkı açıldı.`,
      }, tx);
      const phone = networkContactPhone(channel === 'CALL' ? unlock.post.contactPhone : unlock.post.whatsappPhone);
      if (!phone) throw new ForbiddenException('Geçerli iletişim numarası bulunamadı.');
      return {
        ok: true, channel, phone,
        url: channel === 'CALL' ? `tel:${phone}` : `https://wa.me/${phone.slice(1)}`,
        cost: unlock.spent, tariffCostPk: unlock.tariffCostPk, spent: unlock.spent,
        alreadyUnlocked: unlock.alreadyUnlocked, replayed: unlock.alreadyUnlocked,
        balance: unlock.balance, remainingBalance: unlock.balance, operationId: unlock.operationId,
        walletOfficeId: unlock.walletOfficeId, privateInfoUnlocked: true, replyAllowed: true,
        message: unlock.alreadyUnlocked ? 'Erişim daha önce açılmıştı; yeniden PK harcanmadı.' : `İletişim ve yanıt hakkı açıldı. ${unlock.spent} PK harcandı.`,
      };
    });
  }

  async postPrivateInfo(
    postId: string,
    user: CurrentUserPayload,
    body?: NetworkAccessOptions,
  ) {
    const actorId = this.getForumActionUserId(user);
    return this.prisma.$transaction(async tx => {
      const unlock = await this.unlockPostUnifiedAccess(postId, actorId, body, tx);

      return {
        ok: true,
        cost: unlock.spent,
        tariffCostPk: unlock.tariffCostPk,
        spent: unlock.spent,
        alreadyUnlocked: unlock.alreadyUnlocked,
        replayed: unlock.alreadyUnlocked,
        balance: unlock.balance,
        remainingBalance: unlock.balance,
        walletOfficeId: unlock.walletOfficeId,
        operationId: unlock.operationId,
        privateInfoUnlocked: true,
        replyAllowed: true,
        post: this.serializeNetworkPostForViewer(unlock.post, actorId, true, true),
        message: unlock.alreadyUnlocked
          ? "Özel bilgiler daha önce açılmıştı; yeniden PK harcanmadı."
          : `Özel bilgiler ve yanıt hakkı açıldı. ${unlock.spent} PK harcandı.`,
      };
    });
  }

  async messagePost(
    postId: string,
    user: CurrentUserPayload,
    body?: NetworkAccessOptions & { message?: string },
  ) {
    const text = String(body?.message || '').trim();
    if (text.length > 10000) throw new BadRequestException('Mesaj en fazla 10.000 karakter olabilir.');
    if (text) {
      const safety = this.textSafetyService.validate(text, { field: TextSafetyField.MESSAGE });
      if (!safety.valid) throw new BadRequestException({ code: 'UNSAFE_MESSAGE', message: safety.errors[0]?.message || 'Mesaj içeriğini düzenleyin.' });
    }
    const actorId = this.getForumActionUserId(user);
    if (body?.requestId !== undefined && (typeof body.requestId !== 'string' || !/^[A-Za-z0-9_-]{8,160}$/.test(body.requestId))) {
      throw new BadRequestException('Geçersiz yanıt işlem kimliği.');
    }
    const messageId = body?.requestId
      ? 'network-reply-' + createHash('sha256').update(JSON.stringify([actorId, postId, body.requestId])).digest('hex')
      : randomUUID();

    return this.prisma.$transaction(async (tx) => {
      const unlock = await this.unlockPostUnifiedAccess(
        postId,
        actorId,
        {
          ...body,
          aciklama: 'Talep yanıtı gönderildi ve özel bilgi erişimi açıldı.',
        },
        tx,
      );

      const participantIds = [actorId, unlock.post.userId].sort();

      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${'forum-conversation:' + unlock.post.id + ':' + participantIds.join(":")})
        )
      `;

      const previousMessage = body?.requestId ? await tx.message.findUnique({ where: { id: messageId } }) : null;
      if (previousMessage) {
        return {
          ok: true, cost: 0, spent: 0, tariffCostPk: unlock.tariffCostPk,
          alreadyUnlocked: true, replayed: true, balance: unlock.balance, remainingBalance: unlock.balance,
          walletOfficeId: unlock.walletOfficeId, operationId: messageId, conversationId: previousMessage.conversationId,
          url: `/messages/${previousMessage.conversationId}`, privateInfoUnlocked: true, replyAllowed: true,
          message: 'Önceki yanıt açıldı; yeniden mesaj gönderilmedi ve PK harcanmadı.',
        };
      }

      const existingConversation = await tx.conversation.findFirst({
        where: {
          postId: unlock.post.id,
          AND: [
            {
              ConversationParticipant: {
                some: { userId: actorId },
              },
            },
            {
              ConversationParticipant: {
                some: { userId: unlock.post.userId },
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
                postId: unlock.post.id,
                title: `Talep Merkezi Mesajı - ${unlock.post.title}`,
                updatedAt: new Date(),
                ConversationParticipant: {
                  create: [
                    { id: randomUUID(), userId: actorId },
                    { id: randomUUID(), userId: unlock.post.userId },
                  ],
                },
              },
              include: {
                ConversationParticipant: true,
              },
            });

      const message =
        this.cleanForumActionText(body?.message) ||
        `Merhaba, "${unlock.post.title}" başlıklı talebiniz hakkında görüşmek istiyorum.`;

      await tx.message.create({
        data: {
          id: messageId,
          conversationId: conversation.id,
          senderId: actorId,
          body: message,
        },
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      const actor = await tx.user.findUnique({
        where: { id: actorId },
        select: { firstName: true, lastName: true },
      });
      const actorName = actor
        ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim()
        : "Bir kullanıcı";

      await tx.networkNotification.create({
        data: {
          userId: unlock.post.userId,
          postId: unlock.post.id,
          title: "Talebinize yanıt geldi",
          message: `${actorName}, "${unlock.post.title}" talebinize yanıt verdi.`,
        },
      });

      return {
        ok: true,
        cost: unlock.cost,
        spent: unlock.spent,
        tariffCostPk: unlock.tariffCostPk,
        alreadyUnlocked: unlock.alreadyUnlocked,
        replayed: unlock.alreadyUnlocked,
        balance: unlock.balance,
        remainingBalance: unlock.balance,
        walletOfficeId: unlock.walletOfficeId,
        operationId: unlock.operationId || `conv-${conversation.id}`,
        conversationId: conversation.id,
        url: `/messages/${conversation.id}`,
        privateInfoUnlocked: true,
        replyAllowed: true,
        message: unlock.alreadyUnlocked
          ? "Talebe yanıt verildi. Ek PK harcanmadı."
          : `Talebe yanıt verildi ve iletişim erişimi açıldı. ${unlock.spent} PK harcandı.`,
      };
    });
  }

  async interestPost(
    postId: string,
    user: CurrentUserPayload,
    body?: ForumActionPayload,
  ) {
    throw new BadRequestException(
      "?lgileniyorum i?lemi g?ncel tarifede kald?r?lm??t?r. L?tfen Talebe Yan?t Ver veya ?leti?im butonunu kullan?n.",
    );
  }

  async helpPost(
    postId: string,
    user: CurrentUserPayload,
    body?: ForumActionPayload,
  ) {
    throw new BadRequestException(
      "Yard?mc? Olabilirim i?lemi g?ncel tarifede kald?r?lm??t?r. L?tfen Talebe Yan?t Ver veya ?leti?im butonunu kullan?n.",
    );
  }
}
