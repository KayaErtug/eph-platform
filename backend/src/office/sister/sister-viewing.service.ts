import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, Role, SisterRequestStatus, UnitStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { officeLock } from '../office-wallet.rules';
import { eligibilityMap, resolveOfficeAccess, safeNotify, sortedPair } from './sister-shared';

export function viewingInput(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('Tarih ve saat seçin.');
  const body = raw as Record<string, unknown>;
  const value = typeof body.scheduledAt === 'string' ? body.scheduledAt : '';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new BadRequestException('Geçerli tarih ve saat seçin.');
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) throw new BadRequestException('Geçerli bir gün seçin.');
  const scheduledAt = new Date(value);
  if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) throw new BadRequestException('Gelecekte bir tarih ve saat seçin.');
  if (body.note !== undefined && typeof body.note !== 'string') throw new BadRequestException('Açıklama geçersiz.');
  const note = (typeof body.note === 'string' ? body.note : '').trim();
  if (note.length > 500) throw new BadRequestException('Açıklama en fazla 500 karakter olabilir.');
  return { scheduledAt, note };
}

@Injectable()
export class SisterViewingService {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly notifications?: NotificationsService) {}

  private async shared(db: Prisma.TransactionClient, officeId: string, unitId: string, expectedOwnerId?: string) {
    const unit = await db.unit.findFirst({
      where: { id: unitId, sharedWithSisters: true, hiddenFromOffice: false, status: { not: UnitStatus.PASIF }, project: { isActive: true } },
      select: { id: true, project: { select: { name: true, ownerId: true, owner: { select: { officeId: true } } } } },
    });
    if (!unit) throw new NotFoundException('Portföy artık paylaşımda değil.');
    const ownerOfficeId = unit.project.owner.officeId ?? (await db.office.findFirst({ where: { ownerUserId: unit.project.ownerId, isActive: true }, select: { id: true } }))?.id;
    if (!ownerOfficeId || ownerOfficeId === officeId || expectedOwnerId && expectedOwnerId !== ownerOfficeId) throw new NotFoundException('Portföy bulunamadı.');
    const [a, b] = sortedPair(officeId, ownerOfficeId);
    const link = await db.officeSisterLink.findUnique({ where: { officeAId_officeBId: { officeAId: a, officeBId: b } } });
    const eligibility = await eligibilityMap(db, [a, b]);
    if (link?.status !== 'AKTIF' || !eligibility.get(a) || !eligibility.get(b)) throw new ForbiddenException('Kardeş ofis bağı aktif ve uygun olmalıdır.');
    const ownerOffice = await db.office.findUnique({ where: { id: ownerOfficeId }, select: { id: true, name: true, ownerUserId: true, owner: { select: { role: true } } } });
    if (!ownerOffice?.ownerUserId || ownerOffice.owner?.role !== Role.EMLAKCI) throw new ForbiddenException('Ofis sahibi emlakçı hesabı olmalıdır.');
    return { unit, ownerOffice };
  }

  async create(userId: string, officeId: string, unitId: string, raw: unknown) {
    const input = viewingInput(raw);
    const { office } = await resolveOfficeAccess(this.prisma, userId, officeId);
    let result: { id: string; status: SisterRequestStatus; ownerId: string; ownerOfficeId: string; title: string };
    try {
      result = await this.prisma.$transaction(async tx => {
        await officeLock(tx, `viewing:${officeId}:${userId}:${unitId}`);
        const actor = await tx.user.findUnique({ where: { id: userId }, select: { role: true, officeId: true } });
        const currentOffice = await tx.office.findUnique({ where: { id: officeId }, select: { isActive: true, ownerUserId: true } });
        if (!actor || !currentOffice || (actor.role !== Role.SUPER_ADMIN && (actor.role !== Role.EMLAKCI || !currentOffice.isActive || actor.officeId !== officeId && currentOffice.ownerUserId !== userId))) throw new ForbiddenException('Ofis bağlantınız değişmiş.');
        const { unit, ownerOffice } = await this.shared(tx, officeId, unitId);
        if (await tx.sisterViewingRequest.findFirst({ where: { unitId, requesterUserId: userId, status: 'BEKLIYOR', scheduledAt: { gt: new Date() } } })) throw new ConflictException('Bu portföy için bekleyen talebiniz var.');
        const row = await tx.sisterViewingRequest.create({ data: { unitId, requesterOfficeId: officeId, ownerOfficeId: ownerOffice.id, requesterUserId: userId, ...input } });
        return { id: row.id, status: row.status, ownerId: ownerOffice.ownerUserId!, ownerOfficeId: ownerOffice.id, title: unit.project.name };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Bu tarih için talebiniz zaten kayıtlı.');
      throw error;
    }
    await safeNotify(this.notifications, result.ownerId, { type: 'SISTER_VIEWING_REQUEST', title: 'Yer gösterme talebi', body: `${office.name}, ${result.title} için izin istiyor.`, actionUrl: `/office-viewing-requests?officeId=${encodeURIComponent(result.ownerOfficeId)}&box=incoming`, eventKey: `sister-viewing:${result.id}:created` });
    return { id: result.id, status: result.status };
  }

  async list(userId: string, officeId: string, box: unknown, unitId?: string) {
    if (box !== 'incoming' && box !== 'outgoing') throw new BadRequestException('Gelen veya gönderilen talepleri seçin.');
    const { isOwner } = await resolveOfficeAccess(this.prisma, userId, officeId, { ownerOnly: box === 'incoming' });
    return { items: await this.prisma.sisterViewingRequest.findMany({
      where: { ...(box === 'incoming' ? { ownerOfficeId: officeId } : { requesterOfficeId: officeId, ...(isOwner ? {} : { requesterUserId: userId }) }), ...(unitId ? { unitId } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100,
      select: { id: true, status: true, scheduledAt: true, note: true, createdAt: true, decidedAt: true,
        unit: { select: { id: true, project: { select: { name: true } } } },
        requester: { select: { firstName: true, lastName: true } },
        ownerOffice: { select: { name: true } }, requesterOffice: { select: { name: true } },
      },
    }) };
  }

  async decide(userId: string, officeId: string, requestId: string, approve: boolean) {
    const { office } = await resolveOfficeAccess(this.prisma, userId, officeId, { ownerOnly: true });
    const row = await this.prisma.$transaction(async tx => {
      const request = await tx.sisterViewingRequest.findUnique({ where: { id: requestId } });
      if (!request || request.ownerOfficeId !== officeId) throw new NotFoundException('Talep bulunamadı.');
      if (request.status !== 'BEKLIYOR') throw new ConflictException('Bu talep zaten sonuçlandırılmış.');
      const currentOffice = await tx.office.findUnique({ where: { id: officeId }, select: { ownerUserId: true, isActive: true } });
      const actor = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!currentOffice || (actor?.role !== Role.SUPER_ADMIN && (!currentOffice.isActive || currentOffice.ownerUserId !== userId))) throw new ForbiddenException('Yalnız aktif ofis sahibi karar verebilir.');
      if (approve) {
        if (request.scheduledAt.getTime() <= Date.now()) throw new BadRequestException('Talebin zamanı geçmiş; yeni talep gönderilmeli.');
        const requester = await tx.user.findUnique({ where: { id: request.requesterUserId }, select: { role: true, officeId: true } });
        const requesterOffice = await tx.office.findUnique({ where: { id: request.requesterOfficeId }, select: { ownerUserId: true } });
        if (!requester || (requester.role !== Role.SUPER_ADMIN && (requester.role !== Role.EMLAKCI || requester.officeId !== request.requesterOfficeId && requesterOffice?.ownerUserId !== request.requesterUserId))) throw new BadRequestException('Talep sahibinin ofis bağlantısı değişmiş.');
        await this.shared(tx, request.requesterOfficeId, request.unitId, officeId);
      }
      const status = approve ? SisterRequestStatus.ONAYLANDI : SisterRequestStatus.REDDEDILDI;
      const updated = await tx.sisterViewingRequest.updateMany({ where: { id: requestId, status: 'BEKLIYOR' }, data: { status, decidedAt: new Date(), decidedByUserId: userId } });
      if (!updated.count) throw new ConflictException('Bu talep zaten sonuçlandırılmış.');
      return { ...request, status };
    });
    await safeNotify(this.notifications, row.requesterUserId, { type: approve ? 'SISTER_VIEWING_APPROVED' : 'SISTER_VIEWING_REJECTED', title: approve ? 'Yer gösterme izni onaylandı' : 'Yer gösterme talebi reddedildi', body: `${office.name} yer gösterme talebinizi ${approve ? 'onayladı' : 'reddetti'}.`, actionUrl: `/office-viewing-requests?officeId=${encodeURIComponent(row.requesterOfficeId)}&box=outgoing`, eventKey: `sister-viewing:${row.id}:${row.status}` });
    return { id: row.id, status: row.status };
  }
}
