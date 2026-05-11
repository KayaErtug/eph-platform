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
        role: true,
        isApproved: true,
        isVerified: true,
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
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async approveDocument(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Belge bulunamadi.");
    return this.prisma.document.update({
      where: { id },
      data: { status: "APPROVED" },
    });
  }

  async rejectDocument(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Belge bulunamadi.");
    return this.prisma.document.update({
      where: { id },
      data: { status: "REJECTED" },
    });
  }
}