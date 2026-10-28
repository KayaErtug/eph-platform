import { networkPaidAccessWhere } from '../network/network-contact-policy';
import { redactPoolDeedOwnerText } from '../units/pool-privacy';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AdminService } from '../admin/admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { PoolAudienceService } from '../pool-audience/pool-audience.service';
import { CreateSafetyReportDto, ResolveSafetyReportDto, SafetyEntity, SafetyReason, SafetyResolution, SafetyTargetDto } from './content-safety.dto';

const reportSelect = { id: true, entityType: true, entityId: true, reason: true, status: true,
  createdAt: true, resolvedAt: true, resolutionNote: true } satisfies Prisma.ReportSelect;

@Injectable()
export class ContentSafetyService {
  constructor(private readonly prisma: PrismaService, private readonly audience: PoolAudienceService,
    private readonly admin: AdminService) {}

  private async actor(id: string) {
    const actor = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isApproved: true, isVerified: true, professionalVerificationStatus: true } });
    if (!actor || !actor.isApproved || !actor.isVerified) throw new ForbiddenException('Aktif kullanıcı bulunamadı.');
    return actor;
  }

  private async target(userId: string, dto: SafetyTargetDto) {
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(dto.entityId)) throw new BadRequestException('Geçersiz içerik kimliği.');
    const actor = await this.actor(userId);
    if (actor.professionalVerificationStatus && actor.professionalVerificationStatus !== 'VERIFIED') throw new ForbiddenException('Mesleki doğrulamanızı tamamlayınız.');
    if (dto.entityType === SafetyEntity.NETWORK_POST) {
      const post = await this.prisma.networkPost.findFirst({ where: { id: dto.entityId, isActive: true, expiresAt: { gt: new Date() } },
        select: { userId: true, title: true, description: true, visibility: true } });
      const allowed = post && (post.userId === userId || actor.role === Role.SUPER_ADMIN || post.visibility === 'TUM_EPH'
        || (post.visibility === 'SADECE_EMLAKCILAR' && actor.role === Role.EMLAKCI)
        || (post.visibility === 'SADECE_MUTEAHHITLER' && [Role.MUTEAHHIT, Role.INSAAT_FIRMASI].includes(actor.role as any)));
      if (!post || !allowed) throw new NotFoundException('Paylaşım bulunamadı.');
      return { userId: post.userId, label: `Paylaşım: ${post.title}`.slice(0, 160), snapshot: `${post.title}\n${post.description || ''}` };
    }
    if (dto.entityType === SafetyEntity.POOL_UNIT) {
      const unit = await this.prisma.unit.findFirst({ where: { id: dto.entityId, isPoolVisible: true, isOffMarket: false, approvalStatus: 'HAVUZDA', status: { notIn: ['PASIF', 'SATILDI', 'KIRALANDII'] }, project: { isActive: true } },
        select: { id: true, description: true, type: true, deedOwnerFullName: true, deedOwnerPhone: true, deedOwnerEmail: true, project: { select: { ownerId: true } } } });
      if (!unit) throw new NotFoundException('Havuz ilanı bulunamadı.');
      await this.audience.assertCanViewUnit(unit.id, actor);
      return { userId: unit.project.ownerId, label: `Havuz ilanı #${unit.id.slice(-6).toUpperCase()}`, snapshot: `${unit.type}\n${redactPoolDeedOwnerText(unit, unit.description) || ''}` };
    }
    if (dto.entityType === SafetyEntity.MESSAGE) {
      const message = await this.prisma.message.findFirst({ where: { id: dto.entityId,
        Conversation: { ConversationParticipant: { some: { userId } } } }, select: { senderId: true, body: true, Conversation: { select: { title: true, NetworkPost: { select: { id: true, userId: true } } } } } });
      if (!message) throw new NotFoundException('Mesaj bulunamadı.');
      const post = message.Conversation?.NetworkPost;
      if (post && post.userId !== userId && actor.role !== Role.SUPER_ADMIN) {
        const paid = await this.prisma.kontorHareketi.findFirst({ where: networkPaidAccessWhere(userId, post.id), select: { id: true } });
        if (!paid) throw new NotFoundException('Mesaj bulunamadı.');
      }
      return { userId: message.senderId, label: `Görüşme: ${message.Conversation?.title || 'EPH mesajlaşması'}`.slice(0, 160), snapshot: message.body };
    }
    throw new BadRequestException('Geçersiz içerik türü.');
  }

  async context(userId: string, dto: SafetyTargetDto) {
    const target = await this.target(userId, dto);
    return { canReport: target.userId !== userId, canBlock: target.userId !== userId };
  }

  async report(userId: string, dto: CreateSafetyReportDto) {
    const target = await this.target(userId, dto);
    if (target.userId === userId) throw new BadRequestException('Kendi içeriğinizi şikâyet edemezsiniz.');
    const description = String(dto.description || '').trim();
    if (dto.reason === SafetyReason.OTHER && description.length < 10) throw new BadRequestException('Diğer nedeni için en az 10 karakter açıklama yazın.');
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      const existing = await tx.report.findFirst({ where: { reporterId: userId, entityType: dto.entityType, entityId: dto.entityId, status: 'ACIK' }, select: reportSelect });
      if (existing) return { ok: true, duplicate: true, report: existing };
      const daily = await tx.report.count({ where: { reporterId: userId, createdAt: { gte: new Date(Date.now() - 86400000) } } });
      if (daily >= 20) throw new BadRequestException('Günlük şikâyet sınırına ulaştınız. Destek ekibine ulaşabilirsiniz.');
      const report = await tx.report.create({ data: { reporterId: userId, targetUserId: target.userId, entityType: dto.entityType,
        entityId: dto.entityId, reason: dto.reason, description: `${description}\n\nİçerik kaydı:\n${target.snapshot.slice(0, 3000)}` }, select: reportSelect });
      return { ok: true, duplicate: false, report };
    });
  }

  async block(userId: string, dto: SafetyTargetDto) {
    const target = await this.target(userId, dto);
    if (target.userId === userId) throw new BadRequestException('Kendinizi engelleyemezsiniz.');
    await this.prisma.$transaction(async tx => {
    await tx.userBlock.upsert({ where: { blockerId_blockedId: { blockerId: userId, blockedId: target.userId } },
      create: { blockerId: userId, blockedId: target.userId, label: target.label }, update: {} });
    await tx.$executeRaw`DELETE FROM "NetworkNotification" n USING "NetworkPost" p WHERE n."postId" = p."id" AND ((n."userId" = ${userId} AND p."userId" = ${target.userId}) OR (n."userId" = ${target.userId} AND p."userId" = ${userId}))`;
    });
    return { ok: true };
  }

  async unblock(userId: string, blockId: string) {
    await this.actor(userId);
    await this.prisma.userBlock.deleteMany({ where: { id: blockId, blockerId: userId } });
    return { ok: true };
  }

  async listBlocks(userId: string, cursor?: string) {
    await this.actor(userId);
    if (cursor) {
      const owned = await this.prisma.userBlock.findFirst({ where: { id: cursor, blockerId: userId }, select: { id: true } });
      if (!owned) throw new BadRequestException('Engelleme sayfası bulunamadı.');
    }
    const rows = await this.prisma.userBlock.findMany({ where: { blockerId: userId }, select: { id: true, createdAt: true, label: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    return { blocks: rows.slice(0, 50).map(block => ({ id: block.id, createdAt: block.createdAt,
      name: block.label || 'EPH kullanıcısı' })),
      nextBlockCursor: rows.length > 50 ? rows[49].id : null };
  }

  async mine(userId: string) {
    await this.actor(userId);
    let canModerate = false;
    try { await this.moderator(userId); canModerate = true; } catch (issue) { if (!(issue instanceof ForbiddenException)) throw issue; }
    const [page, reports] = await Promise.all([
      this.listBlocks(userId),
      this.prisma.report.findMany({ where: { reporterId: userId }, select: reportSelect, orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);
    return { canModerate, ...page, reports };
  }

  private async moderator(userId: string, removeContent = false) {
    const actor = await this.actor(userId);
    if (![Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR].includes(actor.role as any)) throw new ForbiddenException('Moderasyon yetkiniz yok.');
    const permission = await this.admin.resolveOperationalPermission(actor, removeContent ? 'FORUM_MODERATE' : 'REPORT_VIEW');
    if (!permission.enabled) throw new ForbiddenException('Bu moderasyon işlemi için yetkiniz yok.');
    return actor;
  }

  async queue(userId: string) {
    await this.moderator(userId);
    return this.prisma.report.findMany({ where: { status: 'ACIK', entityType: { in: Object.values(SafetyEntity) } },
      select: { ...reportSelect, description: true, reporter: { select: { firstName: true, lastName: true } }, targetUserId: true },
      orderBy: { createdAt: 'asc' }, take: 100 });
  }

  async resolve(userId: string, reportId: string, dto: ResolveSafetyReportDto) {
    const actor = await this.moderator(userId, dto.action === SafetyResolution.REMOVE_CONTENT);
    if (dto.note.trim().length < 5) throw new BadRequestException('İnceleme notu en az 5 karakter olmalı.');
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Report" WHERE "id" = ${reportId} FOR UPDATE`;
      const report = await tx.report.findUnique({ where: { id: reportId } });
      if (!report || !Object.values(SafetyEntity).includes(report.entityType as SafetyEntity)) throw new NotFoundException('Şikâyet bulunamadı.');
      if (report.targetUserId === actor.id && actor.role !== Role.SUPER_ADMIN) throw new ForbiddenException('Kendi içeriğinizle ilgili şikâyeti sonuçlandıramazsınız.');
      if (report.status !== 'ACIK') throw new BadRequestException('Şikâyet zaten sonuçlandırılmış.');
      if (dto.action === SafetyResolution.REMOVE_CONTENT) {
        if (!report.entityId) throw new BadRequestException('İçerik bilgisi eksik.');
        if (report.entityType === SafetyEntity.NETWORK_POST) await tx.networkPost.updateMany({ where: { id: report.entityId }, data: { isActive: false } });
        if (report.entityType === SafetyEntity.POOL_UNIT) await tx.unit.updateMany({ where: { id: report.entityId }, data: { isPoolVisible: false, approvalStatus: 'REDDEDILDI' } });
        if (report.entityType === SafetyEntity.MESSAGE) await tx.message.updateMany({ where: { id: report.entityId }, data: { body: '[İçerik moderasyon tarafından kaldırıldı.]' } });
      }
      const result = await tx.report.update({ where: { id: reportId }, data: { status: dto.action === SafetyResolution.REMOVE_CONTENT ? 'COZULDU' : 'REDDEDILDI', resolvedById: actor.id,
        resolvedAt: new Date(), resolutionNote: dto.note.trim() }, select: reportSelect });
      await tx.adminActionLog.create({ data: { actorId: actor.id, targetUserId: report.targetUserId,
        action: dto.action === SafetyResolution.REMOVE_CONTENT ? 'SAFETY_CONTENT_REMOVED' : 'SAFETY_REPORT_DISMISSED',
        entityType: 'Report', entityId: reportId, description: dto.note.trim() } });
      return { ok: true, report: result };
    });
  }
}
