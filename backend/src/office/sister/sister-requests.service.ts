import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, SisterRequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { eligibilityMap, fullName, resolveOfficeAccess, safeNotify, sortedPair } from './sister-shared';

@Injectable()
export class SisterRequestsService {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly notifications?: NotificationsService) {}

  // incoming: ofisin ilanları için gelen istekler (yalnız sahip). outgoing: bu ofisten yapılan istekler (üye yalnız kendisininkini görür).
  async list(userId: string, officeId: string, box: unknown) {
    if (box !== 'incoming' && box !== 'outgoing') throw new BadRequestException('box incoming veya outgoing olmalıdır.');
    const { office, actor, isOwner } = await resolveOfficeAccess(this.prisma, userId, officeId, { ownerOnly: box === 'incoming' });
    const where: Prisma.SisterPrivateInfoRequestWhereInput = box === 'incoming'
      ? { ownerOfficeId: office.id }
      : { requesterOfficeId: office.id, ...(isOwner ? {} : { requesterUserId: actor.id }) };
    const rows = await this.prisma.sisterPrivateInfoRequest.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 100,
      include: {
        ownerOffice: { select: { id: true, name: true } },
        requesterOffice: { select: { id: true, name: true } },
        unit: { select: { id: true, type: true, roomCount: true, price: true, priceCurrency: true, project: { select: { name: true } }, images: { select: { url: true, supabaseUrl: true }, orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 1 } } },
      },
    });
    const userIds = [...new Set(rows.map(r => r.requesterUserId))];
    const users = box === 'incoming' && userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const nameById = new Map(users.map(u => [u.id, fullName(u)]));
    return {
      items: rows.map(r => ({
        id: r.id, status: r.status, createdAt: r.createdAt, decidedAt: r.decidedAt,
        unit: { id: r.unit.id, title: r.unit.project.name, type: r.unit.type, roomCount: r.unit.roomCount, price: r.unit.price, priceCurrency: r.unit.priceCurrency, coverUrl: r.unit.images[0] ? r.unit.images[0].supabaseUrl || r.unit.images[0].url : null },
        office: box === 'incoming' ? r.requesterOffice : r.ownerOffice,
        ...(box === 'incoming' ? { requesterName: nameById.get(r.requesterUserId) ?? '' } : {}),
      })),
    };
  }

  private async decide(userId: string, officeId: string, reqId: string, approve: boolean) {
    const { office, actor } = await resolveOfficeAccess(this.prisma, userId, officeId, { ownerOnly: true });
    const req = await this.prisma.sisterPrivateInfoRequest.findUnique({ where: { id: reqId } });
    if (!req || req.ownerOfficeId !== office.id) throw new NotFoundException('İstek bulunamadı.');
    if (req.status !== SisterRequestStatus.BEKLIYOR) throw new BadRequestException('Bu istek artık beklemede değil.');
    if (approve) {
      const [a, b] = sortedPair(req.ownerOfficeId, req.requesterOfficeId);
      const link = await this.prisma.officeSisterLink.findUnique({ where: { officeAId_officeBId: { officeAId: a, officeBId: b } } });
      const elig = await eligibilityMap(this.prisma, [a, b]);
      if (link?.status !== 'AKTIF' || !elig.get(a) || !elig.get(b)) throw new BadRequestException('Kardeş ofis bağı aktif değil; istek onaylanamaz.');
    }
    const status = approve ? SisterRequestStatus.ONAYLANDI : SisterRequestStatus.REDDEDILDI;
    const res = await this.prisma.sisterPrivateInfoRequest.updateMany({
      where: { id: req.id, status: SisterRequestStatus.BEKLIYOR },
      data: { status, decidedByUserId: actor.id, decidedAt: new Date() },
    });
    if (res.count === 0) throw new BadRequestException('Bu istek artık beklemede değil.');
    await safeNotify(this.notifications, req.requesterUserId, {
      type: approve ? 'SISTER_PRIVATE_APPROVED' : 'SISTER_PRIVATE_REJECTED',
      title: approve ? 'Özel bilgi isteğiniz onaylandı' : 'Özel bilgi isteğiniz reddedildi',
      body: `${office.name} özel bilgi isteğinizi ${approve ? 'onayladı' : 'reddetti'}.`,
      actionUrl: '/office', eventKey: `sister-private-decision:${req.id}:${status}:${Date.now()}`,
    });
    return { id: req.id, status };
  }

  approve(userId: string, officeId: string, reqId: string) { return this.decide(userId, officeId, reqId, true); }
  reject(userId: string, officeId: string, reqId: string) { return this.decide(userId, officeId, reqId, false); }
}
