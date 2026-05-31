import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail.service";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

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

  async getUsers(filter?: "pending" | "approved" | "all") {
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
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async approveUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Kullanici bulunamadi.");
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

    try {
      await this.mail.sendUserApproved(user.email, user.firstName);
    } catch {}

    return updated;
  }

  async rejectUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Kullanici bulunamadi.");
    }

    return this.prisma.user.delete({ where: { id } });
  }

  async suspendUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Kullanici bulunamadi.");
    }

    if (user.role === "ADMIN") {
      throw new BadRequestException("Admin askıya alınamaz.");
    }

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

    try {
      await this.mail.sendUserSuspended(user.email, user.firstName);
    } catch {}

    return updated;
  }

  async changeUserRole(id: string, role: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Kullanici bulunamadi.");
    }

    if (user.role === "ADMIN") {
      throw new BadRequestException("Admin rolü değiştirilemez.");
    }

    return this.prisma.user.update({
      where: { id },
      data: { role: role as any },
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
  }

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new BadRequestException("Bu email zaten kayıtlı.");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const referralCode = await this.generateUniqueReferralCode();

    return this.prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: data.role as any,
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
      throw new NotFoundException("Belge bulunamadi.");
    }

    return this.prisma.document.update({
      where: { id },
      data: { status: "APPROVED" },
    });
  }

  async rejectDocument(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });

    if (!doc) {
      throw new NotFoundException("Belge bulunamadi.");
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
      throw new NotFoundException("Tavsiye bulunamadi.");
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
    const where = status && status !== "all" ? { status: status as any } : {};

    return this.prisma.application.findMany({
      where,
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
      },
      orderBy: [{ referrerId: "desc" }, { createdAt: "desc" }],
    });
  }

  async updateApplicationStatus(id: string, status: string, adminNote?: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException("Basvuru bulunamadi.");
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        status: status as any,
        ...(adminNote !== undefined && { adminNote }),
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