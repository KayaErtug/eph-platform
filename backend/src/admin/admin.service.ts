import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail.service";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

type AdminActor = {
  id?: string;
  role?: Role | string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
};

type SuspendDuration = "ONE_HOUR" | "ONE_DAY" | "ONE_WEEK" | "ONE_MONTH" | "PERMANENT";

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  private generateInviteCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const part = (len: number) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `EMK-${part(4)}-${part(4)}`;
  }

  private generateReferralCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "EPH-";

    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  private async generateUniqueReferralCode(): Promise<string> {
    let code = this.generateReferralCode();

    let existingUser = await this.prisma.user.findFirst({
      where: { referralCode: code },
    });

    let existingCandidate = await this.prisma.referralCandidate.findFirst({
      where: { referralCode: code },
    });

    while (existingUser || existingCandidate) {
      code = this.generateReferralCode();

      existingUser = await this.prisma.user.findFirst({
        where: { referralCode: code },
      });

      existingCandidate = await this.prisma.referralCandidate.findFirst({
        where: { referralCode: code },
      });
    }

    return code;
  }

  private readonly tersTurkAlfabesi: Record<string, string> = {
    A: "29",
    B: "28",
    C: "27",
    Ç: "26",
    D: "25",
    E: "24",
    F: "23",
    G: "22",
    Ğ: "21",
    H: "20",
    I: "19",
    İ: "18",
    J: "17",
    K: "16",
    L: "15",
    M: "14",
    N: "13",
    O: "12",
    Ö: "11",
    P: "10",
    R: "09",
    S: "08",
    Ş: "07",
    T: "06",
    U: "05",
    Ü: "04",
    V: "03",
    Y: "02",
    Z: "01",
  };

  private readonly rolKodlari: Record<Role, string> = {
    EMLAKCI: "EML",
    MUTEAHHIT: "MUT",
    INSAAT_FIRMASI: "INS",
    MODERATOR: "MOD",
    ADMIN: "ADM",
    SUPER_ADMIN: "SUP",
  };

  private guvenlikKoduUret(length = 7): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";

    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  private normalizeName(value: string): string {
    return value
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleUpperCase("tr-TR");
  }

  private getHarfKodu(harf: string): string {
    const kod = this.tersTurkAlfabesi[harf.toLocaleUpperCase("tr-TR")];

    if (!kod) {
      throw new BadRequestException(`Referans kodu üretilemedi. Desteklenmeyen karakter: ${harf}`);
    }

    return kod;
  }

  private adayAdSoyadAyir(firstName: string, lastName: string) {
    const ad = this.normalizeName(firstName);
    const soyad = this.normalizeName(lastName);

    if (!ad || !soyad) {
      throw new BadRequestException("Referans kodu için ad ve soyad gereklidir.");
    }

    if (ad.length < 2 || soyad.length < 2) {
      throw new BadRequestException("Referans kodu için ad ve soyad en az 2 harf olmalıdır.");
    }

    return { ad, soyad };
  }

  private generateProfessionalReferralCode(firstName: string, lastName: string, role: Role): string {
    const { ad, soyad } = this.adayAdSoyadAyir(firstName, lastName);

    const adIlk = this.getHarfKodu(ad[0]);
    const soyadIlk = this.getHarfKodu(soyad[0]);
    const adIkinci = this.getHarfKodu(ad[1]);
    const soyadIkinci = this.getHarfKodu(soyad[1]);

    return `EPH-${adIlk}-${this.rolKodlari[role]}${soyadIlk}-${adIkinci}${soyadIkinci}${this.guvenlikKoduUret()}`;
  }

  private async generateUniqueProfessionalReferralCode(firstName: string, lastName: string, role: Role): Promise<string> {
    let code = this.generateProfessionalReferralCode(firstName, lastName, role);

    let existingUser = await this.prisma.user.findFirst({
      where: { referralCode: code },
    });

    let existingCandidate = await this.prisma.referralCandidate.findFirst({
      where: { referralCode: code },
    });

    let existingInvitation = await this.prisma.invitation.findUnique({
      where: { code },
    });

    while (existingUser || existingCandidate || existingInvitation) {
      code = this.generateProfessionalReferralCode(firstName, lastName, role);

      existingUser = await this.prisma.user.findFirst({
        where: { referralCode: code },
      });

      existingCandidate = await this.prisma.referralCandidate.findFirst({
        where: { referralCode: code },
      });

      existingInvitation = await this.prisma.invitation.findUnique({
        where: { code },
      });
    }

    return code;
  }

  private normalizeApplicationStatus(status?: string) {
    if (!status || status === "all") {
      return {};
    }

    return { status: status as any };
  }

  private getActorId(actor?: AdminActor): string {
    const actorId = actor?.id;

    if (!actorId) {
      throw new ForbiddenException("Yönetici kimliği doğrulanamadı.");
    }

    return actorId;
  }

  private getActorRole(actor?: AdminActor): Role | string {
    const role = actor?.role;

    if (!role) {
      throw new ForbiddenException("Yönetici rolü doğrulanamadı.");
    }

    return role;
  }

  private isSoftwareTeam(actor?: AdminActor): boolean {
    return this.getActorRole(actor) === Role.SUPER_ADMIN;
  }

  private isAdmin(actor?: AdminActor): boolean {
    return this.getActorRole(actor) === Role.ADMIN;
  }

  private requireSoftwareTeam(actor?: AdminActor) {
    if (!this.isSoftwareTeam(actor)) {
      throw new ForbiddenException("Bu işlem sadece Yazılım Ekibi tarafından yapılabilir.");
    }
  }


  private readonly ilPlakaKodlari: Record<string, string> = {
    ADANA: "01",
    ADIYAMAN: "02",
    AFYONKARAHISAR: "03",
    AĞRI: "04",
    AMASYA: "05",
    ANKARA: "06",
    ANTALYA: "07",
    ARTVIN: "08",
    AYDIN: "09",
    BALIKESIR: "10",
    BILECIK: "11",
    BINGOL: "12",
    BITLIS: "13",
    BOLU: "14",
    BURDUR: "15",
    BURSA: "16",
    CANAKKALE: "17",
    CANKIRI: "18",
    CORUM: "19",
    DENIZLI: "20",
    DIYARBAKIR: "21",
    EDIRNE: "22",
    ELAZIG: "23",
    ERZINCAN: "24",
    ERZURUM: "25",
    ESKISEHIR: "26",
    GAZIANTEP: "27",
    GIRESUN: "28",
    GUMUSHANE: "29",
    HAKKARI: "30",
    HATAY: "31",
    ISPARTA: "32",
    MERSIN: "33",
    ISTANBUL: "34",
    IZMIR: "35",
    KARS: "36",
    KASTAMONU: "37",
    KAYSERI: "38",
    KIRKLARELI: "39",
    KIRSEHIR: "40",
    KOCAELI: "41",
    KONYA: "42",
    KUTAHYA: "43",
    MALATYA: "44",
    MANISA: "45",
    KAHRAMANMARAS: "46",
    MARDIN: "47",
    MUGLA: "48",
    MUS: "49",
    NEVSEHIR: "50",
    NIGDE: "51",
    ORDU: "52",
    RIZE: "53",
    SAKARYA: "54",
    SAMSUN: "55",
    SIIRT: "56",
    SINOP: "57",
    SIVAS: "58",
    TEKIRDAG: "59",
    TOKAT: "60",
    TRABZON: "61",
    TUNCELI: "62",
    SANLIURFA: "63",
    USAK: "64",
    VAN: "65",
    YOZGAT: "66",
    ZONGULDAK: "67",
    AKSARAY: "68",
    BAYBURT: "69",
    KARAMAN: "70",
    KIRIKKALE: "71",
    BATMAN: "72",
    SIRNAK: "73",
    BARTIN: "74",
    ARDAHAN: "75",
    IGDIR: "76",
    YALOVA: "77",
    KARABUK: "78",
    KILIS: "79",
    OSMANIYE: "80",
    DUZCE: "81",
  };

  private normalizeCityName(value?: string | null): string {
    return String(value || "")
      .trim()
      .toLocaleUpperCase("tr-TR")
      .replace(/Ç/g, "C")
      .replace(/Ğ/g, "G")
      .replace(/İ/g, "I")
      .replace(/İ/g, "I")
      .replace(/Ö/g, "O")
      .replace(/Ş/g, "S")
      .replace(/Ü/g, "U");
  }

  private normalizeMemberPlateCode(cityPlateCode?: string | null, city?: string | null): string {
    const rawPlate = String(cityPlateCode || "").trim();
    const plateDigits = rawPlate.match(/\d{1,2}/)?.[0];

    if (plateDigits) {
      return plateDigits.padStart(2, "0").slice(-2);
    }

    const normalizedCity = this.normalizeCityName(city);

    return this.ilPlakaKodlari[normalizedCity] || "00";
  }

  private getMemberYear(memberSince?: Date | string | null, createdAt?: Date | string | null): string {
    const baseDate = memberSince || createdAt || new Date();
    const date = baseDate instanceof Date ? baseDate : new Date(baseDate);

    if (Number.isNaN(date.getTime())) {
      return String(new Date().getFullYear());
    }

    return String(date.getFullYear());
  }

  private async getNextMemberSequence(): Promise<number> {
    const users = await this.prisma.user.findMany({
      where: {
        memberCode: { not: null },
      },
      select: {
        memberCode: true,
      },
    });

    const maxSequence = users.reduce((max, user) => {
      const match = String(user.memberCode || "").match(/^EPH-\d{2}-\d{4}-(\d{6})$/);
      const sequence = match ? Number(match[1]) : 0;

      return Number.isFinite(sequence) && sequence > max ? sequence : max;
    }, 0);

    return maxSequence + 1;
  }

  private async generateUniqueMemberCode(user: {
    cityPlateCode?: string | null;
    city?: string | null;
    memberSince?: Date | string | null;
    createdAt?: Date | string | null;
  }): Promise<string> {
    const plateCode = this.normalizeMemberPlateCode(user.cityPlateCode, user.city);
    const year = this.getMemberYear(user.memberSince, user.createdAt);
    let sequence = await this.getNextMemberSequence();
    let memberCode = `EPH-${plateCode}-${year}-${String(sequence).padStart(6, "0")}`;

    let existing = await this.prisma.user.findUnique({
      where: { memberCode },
      select: { id: true },
    });

    while (existing) {
      sequence += 1;
      memberCode = `EPH-${plateCode}-${year}-${String(sequence).padStart(6, "0")}`;
      existing = await this.prisma.user.findUnique({
        where: { memberCode },
        select: { id: true },
      });
    }

    return memberCode;
  }

  private maskSoftwareTeamUserForActor<T extends Record<string, any>>(user: T | null, actor?: AdminActor): T | null {
    if (!user) {
      return user;
    }

    if (actor?.role === Role.SUPER_ADMIN) {
      return user;
    }

    if (user.role !== Role.SUPER_ADMIN) {
      return user;
    }

    return {
      ...user,
      firstName: "Yazılım",
      lastName: "Ekibi",
      email: "gizli@eph.local",
      phone: "Gizli",
      profileImageUrl: null,
      memberCode: "Gizli",
      city: "Gizli",
      district: "Gizli",
      cityPlateCode: null,
      referralCode: null,
      documents: Array.isArray(user.documents) ? [] : user.documents,
      restrictions: Array.isArray(user.restrictions) ? [] : user.restrictions,
    } as T;
  }

  private maskSoftwareTeamNestedUser<T extends Record<string, any>>(user: T | null | undefined, actor?: AdminActor): T | null | undefined {
    if (!user) {
      return user;
    }

    if (actor?.role === Role.SUPER_ADMIN || user.role !== Role.SUPER_ADMIN) {
      return user;
    }

    return {
      ...user,
      firstName: "Yazılım",
      lastName: "Ekibi",
      email: "gizli@eph.local",
      phone: "Gizli",
      profileImageUrl: null,
      memberCode: "Gizli",
      city: "Gizli",
      district: "Gizli",
      cityPlateCode: null,
      referralCode: null,
    } as T;
  }

  private maskSoftwareTeamVisitForActor<T extends Record<string, any>>(visit: T, actor?: AdminActor): T {
    if (!visit.user) {
      return visit;
    }

    return {
      ...visit,
      user: this.maskSoftwareTeamNestedUser(visit.user, actor),
    } as T;
  }

  private ensureReason(reason?: string): string {
    const cleanReason = String(reason || "").trim();

    if (!cleanReason) {
      throw new BadRequestException("İşlem sebebi zorunludur.");
    }

    return cleanReason;
  }

  private normalizeSuspendDuration(duration?: string): SuspendDuration {
    const value = String(duration || "ONE_HOUR").trim().toUpperCase();

    if (["ONE_HOUR", "1_HOUR", "1_SAAT", "SAAT", "HOUR"].includes(value)) {
      return "ONE_HOUR";
    }

    if (["ONE_DAY", "1_DAY", "1_GUN", "1_GÜN", "GUN", "GÜN", "DAY"].includes(value)) {
      return "ONE_DAY";
    }

    if (["ONE_WEEK", "1_WEEK", "1_HAFTA", "HAFTA", "WEEK"].includes(value)) {
      return "ONE_WEEK";
    }

    if (["ONE_MONTH", "1_MONTH", "1_AY", "AY", "MONTH"].includes(value)) {
      return "ONE_MONTH";
    }

    if (["PERMANENT", "SURESIZ", "SÜRESİZ", "KALICI"].includes(value)) {
      return "PERMANENT";
    }

    throw new BadRequestException("Geçersiz askıya alma süresi.");
  }

  private calculateSuspendEndDate(duration: SuspendDuration): Date | null {
    const endsAt = new Date();

    if (duration === "ONE_HOUR") {
      endsAt.setHours(endsAt.getHours() + 1);
      return endsAt;
    }

    if (duration === "ONE_DAY") {
      endsAt.setDate(endsAt.getDate() + 1);
      return endsAt;
    }

    if (duration === "ONE_WEEK") {
      endsAt.setDate(endsAt.getDate() + 7);
      return endsAt;
    }

    if (duration === "ONE_MONTH") {
      endsAt.setMonth(endsAt.getMonth() + 1);
      return endsAt;
    }

    return null;
  }

  private async logAdminAction(data: {
    actor?: AdminActor;
    targetUserId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    description?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      await this.prisma.adminActionLog.create({
        data: {
          actorId: data.actor?.id || null,
          targetUserId: data.targetUserId || null,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId || null,
          description: data.description || null,
          metadata: data.metadata || undefined,
          ipAddress: data.actor?.ipAddress || null,
          userAgent: data.actor?.userAgent || null,
        },
      });
    } catch (error) {
      console.error("Admin işlem logu yazılamadı:", error);
    }
  }

  async getStats() {
    const totalUsers = await this.prisma.user.count();
    const pendingUsers = await this.prisma.user.count({ where: { isApproved: false } });
    const approvedUsers = await this.prisma.user.count({ where: { isApproved: true } });
    const totalInvitations = await this.prisma.invitation.count();
    const pendingDocuments = await this.prisma.document.count({ where: { status: "PENDING" } });
    const pendingNominations = await this.prisma.nomination.count({ where: { status: "PENDING" } });
    const pendingApplications = await this.prisma.application.count({ where: { status: "PENDING" } });
    const totalReferralCandidates = await this.prisma.referralCandidate.count();
    const activeReferralCandidates = await this.prisma.referralCandidate.count({
      where: { isActive: true },
    });

    const byRole = await this.prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    });

    return {
      totalUsers,
      pendingUsers,
      approvedUsers,
      totalInvitations,
      pendingDocuments,
      pendingNominations,
      pendingApplications,
      totalReferralCandidates,
      activeReferralCandidates,
      byRole: byRole.map((r) => ({ role: r.role, count: r._count.role })),
    };
  }

  async getTrafficSummary(actor?: AdminActor) {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const onlineSince = new Date(now.getTime() - 5 * 60 * 1000);
    const awaySince = new Date(now.getTime() - 20 * 60 * 1000);

    const [
      totalVisits,
      todayVisits,
      weekVisits,
      monthVisits,
      totalUsers,
      onlineUsers,
      awayUsers,
      lastVisits,
      topPages,
      topUserGroups,
    ] = await Promise.all([
      this.prisma.userVisit.count(),
      this.prisma.userVisit.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.userVisit.count({ where: { createdAt: { gte: startOfWeek } } }),
      this.prisma.userVisit.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.user.count(),
      this.prisma.userVisit.findMany({
        where: {
          userId: { not: null },
          createdAt: { gte: onlineSince },
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
      this.prisma.userVisit.findMany({
        where: {
          userId: { not: null },
          createdAt: {
            gte: awaySince,
            lt: onlineSince,
          },
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
      this.prisma.userVisit.findMany({
        take: 30,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          page: true,
          ip: true,
          userAgent: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              city: true,
              district: true,
              cityPlateCode: true,
              memberCode: true,
              profileImageUrl: true,
            },
          },
        },
      }),
      this.prisma.userVisit.groupBy({
        by: ["page"],
        _count: { page: true },
        orderBy: { _count: { page: "desc" } },
        take: 10,
      }),
      this.prisma.userVisit.groupBy({
        by: ["userId"],
        where: { userId: { not: null } },
        _count: { userId: true },
        _max: { createdAt: true },
        orderBy: { _count: { userId: "desc" } },
        take: 10,
      }),
    ]);

    const topUserIds = topUserGroups
      .map((item) => item.userId)
      .filter((id): id is string => Boolean(id));

    const topUsers = topUserIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: topUserIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            city: true,
            district: true,
            cityPlateCode: true,
            memberCode: true,
            profileImageUrl: true,
          },
        })
      : [];

    const topUsersMap = new Map(topUsers.map((user) => [user.id, user]));

    const onlineCount = onlineUsers.length;
    const awayCount = awayUsers.filter((item) => !onlineUsers.some((online) => online.userId === item.userId)).length;
    const offlineCount = Math.max(totalUsers - onlineCount - awayCount, 0);

    return {
      counts: {
        totalVisits,
        todayVisits,
        weekVisits,
        monthVisits,
        totalUsers,
        onlineCount,
        awayCount,
        offlineCount,
      },
      lastVisits: lastVisits.map((visit) => this.maskSoftwareTeamVisitForActor(visit, actor)),
      topPages: topPages.map((item) => ({
        page: item.page,
        count: item._count.page,
      })),
      topUsers: topUserGroups.map((item) => ({
        user: item.userId ? this.maskSoftwareTeamNestedUser(topUsersMap.get(item.userId) || null, actor) : null,
        count: item._count.userId,
        lastSeenAt: item._max.createdAt,
      })),
    };
  }

  async getUsers(filter?: "pending" | "approved" | "all", actor?: AdminActor) {
    const now = new Date();

    const where =
      filter === "pending"
        ? { isApproved: false }
        : filter === "approved"
          ? { isApproved: true }
          : {};

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        profileImageUrl: true,
        role: true,
        memberCode: true,
        memberSince: true,
        city: true,
        district: true,
        cityPlateCode: true,
        isApproved: true,
        isVerified: true,
        nominationPoints: true,
        nominationQuota: true,
        referralCode: true,
        createdAt: true,
        documents: {
          select: {
            id: true,
            type: true,
            status: true,
            fileUrl: true,
            fileName: true,
            createdAt: true,
          },
        },
        restrictions: {
          where: {
            isActive: true,
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          },
          select: {
            id: true,
            type: true,
            reason: true,
            startsAt: true,
            endsAt: true,
            isActive: true,
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map((user) => ({
      ...this.maskSoftwareTeamUserForActor(user, actor),
      restrictions: (user.restrictions || []).map((restriction) => ({
        ...restriction,
        createdBy: this.maskSoftwareTeamNestedUser(restriction.createdBy, actor),
      })),
    }));
  }

  async approveUser(id: string, actor?: AdminActor) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    const memberCode = user.memberCode || (await this.generateUniqueMemberCode(user));

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        isApproved: true,
        ...(user.memberCode ? {} : { memberCode }),
        ...(!user.memberSince ? { memberSince: new Date() } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profileImageUrl: true,
        role: true,
        memberCode: true,
        memberSince: true,
        isApproved: true,
      },
    });

    await this.logAdminAction({
      actor,
      targetUserId: id,
      action: "USER_APPROVED",
      entityType: "User",
      entityId: id,
      description: `${user.email} kullanıcısı onaylandı.`,
    });

    try {
      await this.mail.sendUserApproved(user.email, user.firstName);
    } catch {}

    return updated;
  }

  async rejectUser(id: string, actor?: AdminActor) {
    this.requireSoftwareTeam(actor);

    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    if (user.id === this.getActorId(actor)) {
      throw new BadRequestException("Kendi hesabınızı silemezsiniz.");
    }

    const deleted = await this.prisma.user.delete({ where: { id } });

    await this.logAdminAction({
      actor,
      targetUserId: id,
      action: "USER_DELETED",
      entityType: "User",
      entityId: id,
      description: `${user.email} kullanıcısı Yazılım Ekibi tarafından silindi.`,
      metadata: {
        deletedUserRole: user.role,
      },
    });

    return deleted;
  }

  async suspendUser(
    id: string,
    actor?: AdminActor,
    body?: {
      reason?: string;
      duration?: SuspendDuration | string;
    },
  ) {
    const actorId = this.getActorId(actor);
    const reason = this.ensureReason(body?.reason);

    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    if (user.id === actorId) {
      throw new BadRequestException("Kendi hesabınızı askıya alamazsınız.");
    }

    let duration: SuspendDuration = this.normalizeSuspendDuration(body?.duration);

    if (this.isAdmin(actor)) {
      if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
        throw new ForbiddenException("Admin, Admin veya Yazılım Ekibi hesabını askıya alamaz.");
      }

      duration = "ONE_HOUR";

      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const adminSuspendCount = await this.prisma.userRestriction.count({
        where: {
          createdById: actorId,
          type: "GECICI_ASKI" as any,
          createdAt: { gte: last24Hours },
        },
      });

      if (adminSuspendCount >= 1) {
        throw new ForbiddenException(
          "Admin askıya alma hakkınızı son 24 saat içinde kullandınız. Yeni hak 24 saat sonra açılır.",
        );
      }
    }

    if (!this.isAdmin(actor) && !this.isSoftwareTeam(actor)) {
      throw new ForbiddenException("Bu işlem için yetkiniz yok.");
    }

    const endsAt = this.calculateSuspendEndDate(duration);
    const restrictionType = duration === "PERMANENT" ? "KALICI_ASKI" : "GECICI_ASKI";

    await this.prisma.userRestriction.updateMany({
      where: {
        userId: id,
        isActive: true,
        type: {
          in: ["GECICI_ASKI", "KALICI_ASKI"] as any,
        },
      },
      data: {
        isActive: false,
        liftedAt: new Date(),
        liftedNote: "Yeni askıya alma işlemi nedeniyle önceki aktif askı kapatıldı.",
      },
    });

    const restriction = await this.prisma.userRestriction.create({
      data: {
        userId: id,
        createdById: actorId,
        type: restrictionType as any,
        reason,
        startsAt: new Date(),
        endsAt,
        isActive: true,
      },
    });

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isApproved: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profileImageUrl: true,
        role: true,
        isApproved: true,
      },
    });

    await this.logAdminAction({
      actor,
      targetUserId: id,
      action: this.isSoftwareTeam(actor) ? "USER_SUSPENDED_BY_SOFTWARE_TEAM" : "USER_SUSPENDED_BY_ADMIN",
      entityType: "UserRestriction",
      entityId: restriction.id,
      description:
        duration === "PERMANENT"
          ? `${user.email} kullanıcısı süresiz askıya alındı.`
          : `${user.email} kullanıcısı süreli askıya alındı.`,
      metadata: {
        duration,
        endsAt,
        reason,
        targetRole: user.role,
      },
    });

    try {
      await this.mail.sendUserSuspended(user.email, user.firstName);
    } catch {}

    return {
      user: updated,
      restriction,
      message:
        duration === "PERMANENT"
          ? "Kullanıcı süresiz askıya alındı."
          : "Kullanıcı süreli askıya alındı.",
    };
  }

  async changeUserRole(id: string, role: Role | string, actor?: AdminActor) {
    this.requireSoftwareTeam(actor);

    const normalizedRole = String(role || "").trim().toUpperCase() as Role;

    if (!Object.values(Role).includes(normalizedRole)) {
      throw new BadRequestException("Geçersiz rol.");
    }

    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    if (user.id === this.getActorId(actor)) {
      throw new BadRequestException("Kendi rolünüzü değiştiremezsiniz.");
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: normalizedRole },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profileImageUrl: true,
        role: true,
        isApproved: true,
      },
    });

    await this.logAdminAction({
      actor,
      targetUserId: id,
      action: "USER_ROLE_CHANGED",
      entityType: "User",
      entityId: id,
      description: `${user.email} kullanıcısının rolü değiştirildi.`,
      metadata: {
        oldRole: user.role,
        newRole: normalizedRole,
      },
    });

    return updated;
  }

  async createUser(
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      password: string;
      role: Role | string;
    },
    actor?: AdminActor,
  ) {
    const normalizedRole = String(data.role || "").trim().toUpperCase() as Role;

    if (!Object.values(Role).includes(normalizedRole)) {
      throw new BadRequestException("Geçersiz rol.");
    }

    if (
      normalizedRole === Role.ADMIN ||
      normalizedRole === Role.MODERATOR ||
      normalizedRole === Role.SUPER_ADMIN
    ) {
      this.requireSoftwareTeam(actor);
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new BadRequestException("Bu e-posta zaten kayıtlı.");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const referralCode = await this.generateUniqueReferralCode();

    const created = await this.prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: normalizedRole,
        isApproved: true,
        isVerified: true,
        referralCode,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profileImageUrl: true,
        role: true,
        city: true,
        district: true,
        cityPlateCode: true,
        memberCode: true,
        memberSince: true,
        createdAt: true,
        isApproved: true,
        referralCode: true,
      },
    });

    const createdMemberCode = await this.generateUniqueMemberCode(created);

    const createdWithMemberCode = await this.prisma.user.update({
      where: { id: created.id },
      data: {
        memberCode: createdMemberCode,
        memberSince: new Date(),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profileImageUrl: true,
        role: true,
        city: true,
        district: true,
        cityPlateCode: true,
        memberCode: true,
        memberSince: true,
        isApproved: true,
        referralCode: true,
      },
    });

    await this.logAdminAction({
      actor,
      targetUserId: created.id,
      action: "USER_CREATED",
      entityType: "User",
      entityId: created.id,
      description: `${created.email} kullanıcısı oluşturuldu.`,
      metadata: {
        createdRole: created.role,
      },
    });

    return createdWithMemberCode;
  }

  async assignMemberCodeToUser(id: string, actor?: AdminActor) {
    this.requireSoftwareTeam(actor);

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        profileImageUrl: true,
        role: true,
        memberCode: true,
        memberSince: true,
        city: true,
        district: true,
        cityPlateCode: true,
        isApproved: true,
        isVerified: true,
        nominationPoints: true,
        nominationQuota: true,
        referralCode: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    if (user.memberCode) {
      return {
        success: true,
        message: "Kullanıcının üye numarası zaten var.",
        user,
      };
    }

    const memberCode = await this.generateUniqueMemberCode(user);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        memberCode,
        ...(!user.memberSince ? { memberSince: new Date() } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        profileImageUrl: true,
        role: true,
        memberCode: true,
        memberSince: true,
        city: true,
        district: true,
        cityPlateCode: true,
        isApproved: true,
        isVerified: true,
        nominationPoints: true,
        nominationQuota: true,
        referralCode: true,
        createdAt: true,
      },
    });

    await this.logAdminAction({
      actor,
      targetUserId: id,
      action: "USER_MEMBER_CODE_ASSIGNED",
      entityType: "User",
      entityId: id,
      description: `${user.email} kullanıcısına ${memberCode} üye numarası atandı.`,
      metadata: {
        memberCode,
        plateCode: memberCode.split("-")[1],
      },
    });

    return {
      success: true,
      message: "Üye numarası oluşturuldu.",
      user: updated,
    };
  }

  async assignMissingMemberCodes(actor?: AdminActor) {
    this.requireSoftwareTeam(actor);

    const users = await this.prisma.user.findMany({
      where: {
        isApproved: true,
        memberCode: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        city: true,
        cityPlateCode: true,
        memberSince: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const updatedUsers = [];

    for (const user of users) {
      const memberCode = await this.generateUniqueMemberCode(user);

      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          memberCode,
          ...(!user.memberSince ? { memberSince: new Date() } : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          memberCode: true,
          memberSince: true,
          city: true,
          district: true,
          cityPlateCode: true,
          isApproved: true,
        },
      });

      updatedUsers.push(updated);
    }

    await this.logAdminAction({
      actor,
      action: "MISSING_MEMBER_CODES_ASSIGNED",
      entityType: "User",
      description: `${updatedUsers.length} kullanıcıya toplu üye numarası atandı.`,
      metadata: {
        count: updatedUsers.length,
        memberCodes: updatedUsers.map((user) => user.memberCode),
      },
    });

    return {
      success: true,
      message: `${updatedUsers.length} kullanıcıya üye numarası oluşturuldu.`,
      count: updatedUsers.length,
      users: updatedUsers,
    };
  }

  async getReferralCodes(actor?: AdminActor) {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isApproved: true,
        referralCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const candidates = await this.prisma.referralCandidate.findMany({
      orderBy: { createdAt: "desc" },
    });

    return {
      users: users.map((user) => this.maskSoftwareTeamUserForActor(user, actor)),
      candidates,
    };
  }

  async createReferralCandidate(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: Role;
  }) {
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    const email = data.email.trim().toLowerCase();
    const phone = data.phone.trim();
    const role = data.role;

    if (!Object.values(Role).includes(role)) {
      throw new BadRequestException("Geçersiz rol.");
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      throw new BadRequestException("Bu e-posta veya telefonla kayıtlı kullanıcı var.");
    }

    const existingCandidate = await this.prisma.referralCandidate.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingCandidate) {
      throw new BadRequestException("Bu kişi için daha önce referans kodu oluşturulmuş.");
    }

    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        OR: [{ adayEposta: email }, { adayAdSoyad: `${firstName} ${lastName}` }],
      },
    });

    if (existingInvitation) {
      throw new BadRequestException("Bu kişi için daha önce davet kodu oluşturulmuş.");
    }

    const referralCode = await this.generateUniqueProfessionalReferralCode(firstName, lastName, role);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const [candidate, invitation] = await this.prisma.$transaction([
      this.prisma.referralCandidate.create({
        data: {
          referralCode,
          firstName,
          lastName,
          email,
          phone,
          role,
          isActive: true,
        },
      }),
      this.prisma.invitation.create({
        data: {
          code: referralCode,
          role,
          adayAdSoyad: `${firstName} ${lastName}`,
          adayEposta: email,
          pilotDavetiMi: true,
          expiresAt,
          maxUses: 1,
          onayYetkiSeviyesi: "MODERATOR_ADMIN_SUPER_ADMIN" as any,
        },
      }),
    ]);

    try {
      await this.mail.sendReferralInvitation({
        email,
        name: `${firstName} ${lastName}`,
        role,
        referralCode,
        expiresAt,
      });
    } catch (error: any) {
      console.error("Referans davet maili gönderilemedi:", error?.message || error);
    }

    await this.logAdminAction({
      action: "REFERRAL_INVITATION_CREATED",
      entityType: "Invitation",
      entityId: invitation.id,
      description: `${email} adresi için referans davet kodu oluşturuldu.`,
      metadata: {
        referralCode,
        role,
        candidateId: candidate.id,
        expiresAt,
      },
    });

    return {
      ...candidate,
      invitation,
      mailSent: true,
    };
  }

  async deactivateReferralCandidate(id: string) {
    const candidate = await this.prisma.referralCandidate.findUnique({
      where: { id },
    });

    if (!candidate) {
      throw new NotFoundException("Referans kaydı bulunamadı.");
    }

    return this.prisma.referralCandidate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async deleteReferralCandidate(id: string, actor?: AdminActor) {
    this.requireSoftwareTeam(actor);

    const candidate = await this.prisma.referralCandidate.findUnique({
      where: { id },
    });

    if (!candidate) {
      throw new NotFoundException("Referans kaydı bulunamadı.");
    }

    if (candidate.usedAt) {
      throw new BadRequestException("Kullanılmış referans kodu silinemez. Sadece pasifleştirilebilir.");
    }

    const invitation = await this.prisma.invitation.findUnique({
      where: { code: candidate.referralCode },
    });

    await this.prisma.$transaction([
      ...(invitation
        ? [
            this.prisma.invitation.delete({
              where: { code: candidate.referralCode },
            }),
          ]
        : []),
      this.prisma.referralCandidate.delete({
        where: { id },
      }),
    ]);

    await this.logAdminAction({
      actor,
      action: "REFERRAL_INVITATION_DELETED",
      entityType: "ReferralCandidate",
      entityId: id,
      description: `${candidate.email} adresine ait referans kodu Yazılım Ekibi tarafından silindi.`,
      metadata: {
        referralCode: candidate.referralCode,
        role: candidate.role,
        candidateEmail: candidate.email,
        invitationId: invitation?.id || null,
      },
    });

    return {
      success: true,
      message: "Referans kodu silindi.",
      deletedReferralCode: candidate.referralCode,
    };
  }

  async getInvitations() {
    return this.prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async getDocuments(filter?: "pending" | "approved" | "rejected" | "all") {
    const where =
      filter === "pending"
        ? { status: "PENDING" as const }
        : filter === "approved"
          ? { status: "APPROVED" as const }
          : filter === "rejected"
            ? { status: "REJECTED" as const }
            : {};

    return this.prisma.document.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImageUrl: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async approveDocument(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });

    if (!doc) {
      throw new NotFoundException("Belge bulunamadı.");
    }

    return this.prisma.document.update({
      where: { id },
      data: { status: "APPROVED" },
    });
  }

  async rejectDocument(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });

    if (!doc) {
      throw new NotFoundException("Belge bulunamadı.");
    }

    return this.prisma.document.update({
      where: { id },
      data: { status: "REJECTED" },
    });
  }

  async getNominations(status?: string) {
    const where = status && status !== "all" ? { status: status as any } : {};

    return this.prisma.nomination.findMany({
      where,
      include: {
        nominator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImageUrl: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateNominationStatus(id: string, status: string, adminNote?: string) {
    const nomination = await this.prisma.nomination.findUnique({
      where: { id },
    });

    if (!nomination) {
      throw new NotFoundException("Tavsiye bulunamadı.");
    }

    const updated = await this.prisma.nomination.update({
      where: { id },
      data: {
        status: status as any,
        ...(adminNote !== undefined && { adminNote }),
      },
    });

    if (status === "APPROVED") {
      await this.prisma.user.update({
        where: { id: nomination.nominatorId },
        data: { nominationPoints: { increment: 1 } },
      });
    }

    return updated;
  }

  async getApplications(status?: string) {
    return this.prisma.application.findMany({
      where: this.normalizeApplicationStatus(status),
      include: {
        referrer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImageUrl: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
  }

  async getApplicationDashboard(status?: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [applications, pending, approvedThisMonth, rejectedThisMonth, pilotThisMonth, total] =
      await Promise.all([
        this.getApplications(status),
        this.prisma.application.count({ where: { status: "PENDING" as any } }),
        this.prisma.application.count({
          where: {
            status: "APPROVED" as any,
            reviewedAt: { gte: startOfMonth },
          },
        }),
        this.prisma.application.count({
          where: {
            status: "REJECTED" as any,
            rejectedAt: { gte: startOfMonth },
          },
        }),
        this.prisma.application.count({
          where: {
            pilotBasvuruMu: true,
            createdAt: { gte: startOfMonth },
          },
        }),
        this.prisma.application.count(),
      ]);

    return {
      summary: {
        pending,
        approvedThisMonth,
        rejectedThisMonth,
        pilotThisMonth,
        total,
      },
      items: applications,
    };
  }

  async getApplicationDetail(id: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        referrer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImageUrl: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException("Başvuru bulunamadı.");
    }

    return application;
  }

  async approveApplication(id: string, adminNote?: string) {
    return this.updateApplicationStatus(id, "APPROVED", adminNote);
  }

  async rejectApplication(id: string, adminNote?: string, rejectReason?: string) {
    return this.updateApplicationStatus(id, "REJECTED", adminNote, rejectReason);
  }

  async updateApplicationNote(id: string, adminNote: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException("Başvuru bulunamadı.");
    }

    return this.prisma.application.update({
      where: { id },
      data: {
        adminNote,
      },
    });
  }

  async deleteApplication(id: string, actor?: AdminActor) {
    this.requireSoftwareTeam(actor);

    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException("Başvuru bulunamadı.");
    }

    const deleted = await this.prisma.application.delete({
      where: { id },
    });

    await this.logAdminAction({
      actor,
      action: "APPLICATION_DELETED",
      entityType: "Application",
      entityId: id,
      description: `${application.applicantEmail} başvurusu Yazılım Ekibi tarafından kalıcı olarak silindi.`,
      metadata: {
        applicantName: application.applicantName,
        applicantEmail: application.applicantEmail,
        applicantPhone: application.applicantPhone,
        requestedRole: application.requestedRole,
        status: application.status,
        basvuruTuru: application.basvuruTuru,
        pilotBasvuruMu: application.pilotBasvuruMu,
        referralCode: application.referralCode,
      },
    });

    return {
      success: true,
      message: "Başvuru kalıcı olarak silindi.",
      deletedApplication: deleted,
    };
  }

  async updateApplicationStatus(id: string, status: string, adminNote?: string, rejectReason?: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException("Başvuru bulunamadı.");
    }

    const normalizedStatus = status as any;
    const now = new Date();

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        status: normalizedStatus,
        ...(adminNote !== undefined && { adminNote }),
        ...(status === "APPROVED" && {
          reviewedAt: now,
          rejectedAt: null,
          rejectedById: null,
          rejectReason: null,
        }),
        ...(status === "REJECTED" && {
          rejectedAt: now,
          rejectReason: rejectReason || adminNote || "Başvuru reddedildi.",
        }),
      },
      include: {
        referrer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImageUrl: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    try {
      if (status === "APPROVED") {
        await this.mail.sendApplicationApproved(
          application.applicantEmail,
          application.applicantName,
        );
      }

      if (status === "INVITED") {
        const code = this.generateInviteCode();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await this.prisma.invitation.create({
          data: {
            code,
            role: application.requestedRole as any,
            status: "PENDING",
            maxUses: 1,
            usedCount: 0,
            expiresAt,
          },
        });

        await this.mail.sendApplicationInvited(
          application.applicantEmail,
          application.applicantName,
          code,
        );
      }
    } catch (e: any) {
      console.error("Mail hatası:", e.message);
    }

    if (status === "REGISTERED" && application.referrerId) {
      await this.prisma.user.update({
        where: { id: application.referrerId },
        data: { nominationPoints: { increment: 1 } },
      });
    }

    return updated;
  }
}