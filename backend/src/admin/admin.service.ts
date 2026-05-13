import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const totalUsers = await this.prisma.user.count();
    const pendingUsers = await this.prisma.user.count({ where: { isApproved: false } });
    const approvedUsers = await this.prisma.user.count({ where: { isApproved: true } });
    const totalInvitations = await this.prisma.invitation.count();
    const usedInvitations = await this.prisma.invitation.count({ where: { status: "USED" } });
    const pendingDocuments = await this.prisma.document.count({ where: { status: "PENDING" } });
    const pendingNominations = await this.prisma.nomination.count({ where: { status: "PENDING" } });
    const pendingApplications = await this.prisma.application.count({ where: { status: "PENDING" } });

    const byRole = await this.prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    });

    return {
      totalUsers,
      pendingUsers,
      approvedUsers,
      totalInvitations,
      usedInvitations,
      pendingDocuments,
      pendingNominations,
      pendingApplications,
      byRole: byRole.map((r) => ({ role: r.role, count: r._count.role })),
    };
  }

  async getUsers(filter?: "pending" | "approved" | "all") {
    const where =
      filter === "pending" ? { isApproved: false }
      : filter === "approved" ? { isApproved: true }
      : {};

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
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
    if (!user) throw new NotFoundException("Kullanici bulunamadi.");
    return this.prisma.user.update({
      where: { id },
      data: { isApproved: true },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isApproved: true },
    });
  }

  async rejectUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("Kullanici bulunamadi.");
    return this.prisma.user.delete({ where: { id } });
  }

  async getInvitations() {
    return this.prisma.invitation.findMany({ orderBy: { createdAt: "desc" } });
  }

  async getDocuments(filter?: "pending" | "approved" | "rejected" | "all") {
    const where =
      filter === "pending" ? { status: "PENDING" as const }
      : filter === "approved" ? { status: "APPROVED" as const }
      : filter === "rejected" ? { status: "REJECTED" as const }
      : {};

    return this.prisma.document.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async approveDocument(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Belge bulunamadi.");
    return this.prisma.document.update({ where: { id }, data: { status: "APPROVED" } });
  }

  async rejectDocument(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Belge bulunamadi.");
    return this.prisma.document.update({ where: { id }, data: { status: "REJECTED" } });
  }

  async getNominations(status?: string) {
    const where = status && status !== "all" ? { status: status as any } : {};
    return this.prisma.nomination.findMany({
      where,
      include: {
        nominator: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateNominationStatus(id: string, status: string, adminNote?: string) {
    const nomination = await this.prisma.nomination.findUnique({ where: { id } });
    if (!nomination) throw new NotFoundException("Tavsiye bulunamadi.");

    const updated = await this.prisma.nomination.update({
      where: { id },
      data: { status: status as any, ...(adminNote !== undefined && { adminNote }) },
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
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
      orderBy: [{ referrerId: "desc" }, { createdAt: "desc" }],
    });
  }

  async updateApplicationStatus(id: string, status: string, adminNote?: string) {
    const application = await this.prisma.application.findUnique({ where: { id } });
    if (!application) throw new NotFoundException("Basvuru bulunamadi.");

    const updated = await this.prisma.application.update({
      where: { id },
      data: { status: status as any, ...(adminNote !== undefined && { adminNote }) },
    });

    if (status === "REGISTERED" && application.referrerId) {
      await this.prisma.user.update({
        where: { id: application.referrerId },
        data: { nominationPoints: { increment: 1 } },
      });
    }

    return updated;
  }
}