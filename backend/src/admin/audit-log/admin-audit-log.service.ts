import { Injectable, ForbiddenException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type AdminActor = {
  id?: string;
  role?: Role | string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
};

type AuditLogQuery = {
  action?: string;
  actorId?: string;
  targetUserId?: string;
  entityType?: string;
  search?: string;
  limit?: string;
};

@Injectable()
export class AdminAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  private isSuperAdmin(actor?: AdminActor) {
    return String(actor?.role || "").toUpperCase() === Role.SUPER_ADMIN;
  }

  private ensureCanViewAuditLog(actor?: AdminActor) {
    if (!this.isSuperAdmin(actor)) {
      throw new ForbiddenException("Audit Log görüntüleme yetkisi sadece Yazılım Ekibi'ndedir.");
    }
  }

  private normalizeLimit(value?: string) {
    const parsed = Number(value || 100);

    if (!Number.isFinite(parsed)) return 100;
    if (parsed < 1) return 25;
    if (parsed > 300) return 300;

    return parsed;
  }

  async getAuditLogs(query: AuditLogQuery, actor?: AdminActor) {
    this.ensureCanViewAuditLog(actor);

    const limit = this.normalizeLimit(query.limit);
    const search = String(query.search || "").trim();

    const where: any = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.targetUserId ? { targetUserId: query.targetUserId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(search
        ? {
            OR: [
              { action: { contains: search, mode: "insensitive" } },
              { entityType: { contains: search, mode: "insensitive" } },
              { entityId: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { ipAddress: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total, actions, entityTypes] = await Promise.all([
      this.prisma.adminActionLog.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              memberCode: true,
              profileImageUrl: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              memberCode: true,
              profileImageUrl: true,
            },
          },
        },
      }),
      this.prisma.adminActionLog.count({ where }),
      this.prisma.adminActionLog.groupBy({
        by: ["action"],
        _count: { action: true },
        orderBy: { _count: { action: "desc" } },
        take: 50,
      }),
      this.prisma.adminActionLog.groupBy({
        by: ["entityType"],
        _count: { entityType: true },
        orderBy: { _count: { entityType: "desc" } },
        take: 30,
      }),
    ]);

    await this.prisma.adminActionLog.create({
      data: {
        actorId: actor?.id || null,
        action: "VIEW_ADMIN_AUDIT_LOG",
        entityType: "AdminActionLog",
        description: "Yazılım Ekibi Audit Log kayıtlarını görüntüledi.",
        metadata: {
          filters: query,
          resultCount: items.length,
          total,
        },
        ipAddress: actor?.ipAddress || null,
        userAgent: actor?.userAgent || null,
      },
    });

    return {
      total,
      limit,
      items,
      filters: {
        actions: actions.map((item) => ({
          action: item.action,
          count: item._count.action,
        })),
        entityTypes: entityTypes.map((item) => ({
          entityType: item.entityType,
          count: item._count.entityType,
        })),
      },
    };
  }
}