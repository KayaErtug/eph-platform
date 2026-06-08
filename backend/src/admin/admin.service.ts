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

  async getTrafficSummary() {
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
      lastVisits,
      topPages: topPages.map((item) => ({
        page: item.page,
        count: item._count.page,
      })),
      topUsers: topUserGroups.map((item) => ({
        user: item.userId ? topUsersMap.get(item.userId) || null : null,
        count: item._count.userId,
        lastSeenAt: item._max.createdAt,
      })),
    };
  }

  async getUsers(filter?: "pending" | "approved" | "all") {
    const now = new Date();

    const where =
      filter === "pending"
        ? { isApproved: false }
        : filter === "approved"
          ? { isApproved: true }
          : {};

    return this.prisma.user.findMany({
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
  }

  async approveUser(id: string, actor?: AdminActor) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isApproved: true },
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

    return created;
  }

  async getReferralCodes() {
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
      users,
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
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { phone: data.phone }],
      },
    });

    if (existingUser) {
      throw new BadRequestException("Bu e-posta veya telefonla kayıtlı kullanıcı var.");
    }

    const existingCandidate = await this.prisma.referralCandidate.findFirst({
      where: {
        OR: [{ email: data.email }, { phone: data.phone }],
      },
    });

    if (existingCandidate) {
      throw new BadRequestException("Bu kişi için daha önce referans kodu oluşturulmuş.");
    }

    const referralCode = await this.generateUniqueReferralCode();

    return this.prisma.referralCandidate.create({
      data: {
        referralCode,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        role: data.role,
        isActive: true,
      },
    });
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