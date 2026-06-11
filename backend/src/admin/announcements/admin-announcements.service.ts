import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnnouncementAudience, Role } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type AdminActor = {
  id?: string;
  role?: Role | string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
};

type AnnouncementBody = {
  title?: string;
  content?: string;
  audience?: AnnouncementAudience | string;
  isActive?: boolean;
  startsAt?: string;
  endsAt?: string | null;
};

@Injectable()
export class AdminAnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  private getActorId(actor?: AdminActor) {
    const actorId = actor?.id;

    if (!actorId) {
      throw new ForbiddenException("Yönetici kimliği doğrulanamadı.");
    }

    return actorId;
  }

  private canManage(actor?: AdminActor) {
    const role = String(actor?.role || "").toUpperCase();
    return role === Role.ADMIN || role === Role.SUPER_ADMIN;
  }

  private ensureCanManage(actor?: AdminActor) {
    if (!this.canManage(actor)) {
      throw new ForbiddenException("Duyuru yönetimi için yetkiniz yok.");
    }
  }

  private normalizeAudience(value?: string) {
    const audience = String(value || AnnouncementAudience.TUM_UYELER).trim().toUpperCase();

    if (!Object.values(AnnouncementAudience).includes(audience as AnnouncementAudience)) {
      throw new BadRequestException("Geçersiz duyuru hedef kitlesi.");
    }

    return audience as AnnouncementAudience;
  }

  private parseDate(value?: string | null) {
    if (value === null) return null;
    if (!value) return undefined;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("Geçersiz tarih formatı.");
    }

    return date;
  }

  private ensureTitleAndContent(body: AnnouncementBody) {
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();

    if (!title) {
      throw new BadRequestException("Duyuru başlığı zorunludur.");
    }

    if (!content) {
      throw new BadRequestException("Duyuru içeriği zorunludur.");
    }

    return { title, content };
  }

  private async logAdminAction(data: {
    actor?: AdminActor;
    action: string;
    entityId?: string;
    description?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      await this.prisma.adminActionLog.create({
        data: {
          actorId: data.actor?.id || null,
          action: data.action,
          entityType: "PlatformAnnouncement",
          entityId: data.entityId || null,
          description: data.description || null,
          metadata: data.metadata || undefined,
          ipAddress: data.actor?.ipAddress || null,
          userAgent: data.actor?.userAgent || null,
        },
      });
    } catch (error) {
      console.error("Duyuru audit log yazılamadı:", error);
    }
  }

  async getAnnouncements(query?: { status?: string; audience?: string }) {
    const status = String(query?.status || "all").toLowerCase();
    const audience = String(query?.audience || "").trim();

    const where: any = {
      ...(status === "active" ? { isActive: true } : {}),
      ...(status === "passive" ? { isActive: false } : {}),
      ...(audience ? { audience: this.normalizeAudience(audience) } : {}),
    };

    const items = await this.prisma.platformAnnouncement.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      include: {
        createdBy: {
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

    const summary = {
      total: await this.prisma.platformAnnouncement.count(),
      active: await this.prisma.platformAnnouncement.count({ where: { isActive: true } }),
      passive: await this.prisma.platformAnnouncement.count({ where: { isActive: false } }),
      filtered: items.length,
    };

    return { summary, items };
  }

  async createAnnouncement(body: AnnouncementBody, actor?: AdminActor) {
    this.ensureCanManage(actor);

    const actorId = this.getActorId(actor);
    const { title, content } = this.ensureTitleAndContent(body);
    const audience = this.normalizeAudience(body.audience);

    const created = await this.prisma.platformAnnouncement.create({
      data: {
        createdById: actorId,
        title,
        content,
        audience,
        isActive: body.isActive ?? true,
        startsAt: this.parseDate(body.startsAt) || new Date(),
        endsAt: this.parseDate(body.endsAt) || null,
      },
      include: {
        createdBy: {
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

    await this.logAdminAction({
      actor,
      action: "ANNOUNCEMENT_CREATED",
      entityId: created.id,
      description: `${title} başlıklı duyuru oluşturuldu.`,
      metadata: {
        audience,
        isActive: created.isActive,
      },
    });

    return created;
  }

  async updateAnnouncement(id: string, body: AnnouncementBody, actor?: AdminActor) {
    this.ensureCanManage(actor);

    const existing = await this.prisma.platformAnnouncement.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Duyuru bulunamadı.");
    }

    const data: any = {};

    if (body.title !== undefined) {
      const title = String(body.title || "").trim();
      if (!title) throw new BadRequestException("Duyuru başlığı boş olamaz.");
      data.title = title;
    }

    if (body.content !== undefined) {
      const content = String(body.content || "").trim();
      if (!content) throw new BadRequestException("Duyuru içeriği boş olamaz.");
      data.content = content;
    }

    if (body.audience !== undefined) {
      data.audience = this.normalizeAudience(body.audience);
    }

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    if (body.startsAt !== undefined) {
      data.startsAt = this.parseDate(body.startsAt);
    }

    if (body.endsAt !== undefined) {
      data.endsAt = this.parseDate(body.endsAt);
    }

    const updated = await this.prisma.platformAnnouncement.update({
      where: { id },
      data,
      include: {
        createdBy: {
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

    await this.logAdminAction({
      actor,
      action: "ANNOUNCEMENT_UPDATED",
      entityId: id,
      description: `${updated.title} başlıklı duyuru güncellendi.`,
      metadata: {
        before: existing,
        after: updated,
      },
    });

    return updated;
  }

  async deleteAnnouncement(id: string, actor?: AdminActor) {
    const role = String(actor?.role || "").toUpperCase();

    if (role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException("Duyuru silme yetkisi sadece Yazılım Ekibi'ndedir.");
    }

    const existing = await this.prisma.platformAnnouncement.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Duyuru bulunamadı.");
    }

    const deleted = await this.prisma.platformAnnouncement.delete({
      where: { id },
    });

    await this.logAdminAction({
      actor,
      action: "ANNOUNCEMENT_DELETED",
      entityId: id,
      description: `${existing.title} başlıklı duyuru silindi.`,
      metadata: {
        deleted,
      },
    });

    return {
      success: true,
      message: "Duyuru silindi.",
      deleted,
    };
  }
}