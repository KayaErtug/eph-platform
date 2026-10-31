import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, SisterLinkStatus, UnitStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { eligibilityMap, fullName, officeUnitScope, resolveOfficeAccess, safeNotify, sortedPair } from './sister-shared';

const OPEN_STATUSES: SisterLinkStatus[] = [SisterLinkStatus.BEKLIYOR, SisterLinkStatus.AKTIF];

@Injectable()
export class SisterLinksService {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly notifications?: NotificationsService) {}

  // Aktif ve askıda olmayan kardeş ofisler. Havuz/detay bu listeye dayanır.
  async activePartners(officeId: string) {
    const links = await this.prisma.officeSisterLink.findMany({
      where: { status: SisterLinkStatus.AKTIF, OR: [{ officeAId: officeId }, { officeBId: officeId }] },
      select: { id: true, officeAId: true, officeBId: true },
    });
    const otherIds = links.map(l => (l.officeAId === officeId ? l.officeBId : l.officeAId));
    const elig = await eligibilityMap(this.prisma, [officeId, ...otherIds]);
    const suspendedAll = !elig.get(officeId);
    const offices = otherIds.length
      ? await this.prisma.office.findMany({ where: { id: { in: otherIds } }, select: { id: true, name: true, ownerUserId: true, owner: { select: { firstName: true, lastName: true, phone: true } } } })
      : [];
    const byId = new Map(offices.map(o => [o.id, o]));
    const partners = links
      .map(l => ({ linkId: l.id, office: byId.get(l.officeAId === officeId ? l.officeBId : l.officeAId)! }))
      .filter(p => p.office && elig.get(p.office.id));
    return { partners: suspendedAll ? [] : partners, suspended: suspendedAll || partners.length < links.length };
  }

  async list(userId: string, officeId: string) {
    const { office, isOwner } = await resolveOfficeAccess(this.prisma, userId, officeId);
    let code = office.code;
    if (!code && isOwner) code = await this.ensureCode(office.id);
    const links = await this.prisma.officeSisterLink.findMany({
      where: { status: { not: SisterLinkStatus.SONLANDI }, OR: [{ officeAId: officeId }, { officeBId: officeId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        officeA: { select: { id: true, name: true, code: true, city: true, district: true, ownerUserId: true, owner: { select: { firstName: true, lastName: true } } } },
        officeB: { select: { id: true, name: true, code: true, city: true, district: true, ownerUserId: true, owner: { select: { firstName: true, lastName: true } } } },
      },
    });
    const otherOf = (l: (typeof links)[number]) => (l.officeAId === officeId ? l.officeB : l.officeA);
    const elig = await eligibilityMap(this.prisma, [officeId, ...links.map(l => otherOf(l).id)]);
    const items = await Promise.all(links.map(async l => {
      const other = otherOf(l);
      const active = l.status === SisterLinkStatus.AKTIF;
      const suspended = active && !(elig.get(officeId) && elig.get(other.id));
      const visible = active && !suspended;
      const [agentCount, sharedCount] = await Promise.all([
        this.prisma.user.count({ where: { officeId: other.id, ...(other.ownerUserId ? { id: { not: other.ownerUserId } } : {}) } }),
        visible
          ? this.prisma.unit.count({ where: { AND: [{ sharedWithSisters: true, hiddenFromOffice: false, status: { not: UnitStatus.PASIF } }, officeUnitScope(other.id, other.ownerUserId)] } })
          : Promise.resolve(0),
      ]);
      const outgoing = l.invitedByOfficeId === officeId;
      return {
        id: l.id, status: l.status, suspended,
        otherOffice: { id: other.id, name: other.name, code: other.code, city: other.city, district: other.district, ownerName: fullName(other.owner), agentCount, sharedCount },
        commissionSplitPct: outgoing ? l.commissionSplitPct : 100 - l.commissionSplitPct,
        direction: outgoing ? 'outgoing' as const : 'incoming' as const,
        createdAt: l.createdAt,
      };
    }));
    return { myCode: code, eligible: !!elig.get(officeId), links: items };
  }

  private async ensureCode(officeId: string): Promise<string | null> {
    for (let i = 0; i < 8; i++) {
      const code = `OFS-${100000 + Math.floor(Math.random() * 900000)}`;
      try {
        const res = await this.prisma.office.updateMany({ where: { id: officeId, code: null }, data: { code } });
        if (res.count === 0) return (await this.prisma.office.findUnique({ where: { id: officeId }, select: { code: true } }))?.code ?? null;
        return code;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      }
    }
    return null;
  }

  async invite(userId: string, officeId: string, body: { code?: unknown; commissionSplitPct?: unknown }) {
    const { office, actor } = await resolveOfficeAccess(this.prisma, userId, officeId, { ownerOnly: true });
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!code) throw new BadRequestException('Ofis kodu gereklidir.');
    let pct = 50;
    if (body?.commissionSplitPct !== undefined && body.commissionSplitPct !== null) {
      pct = Number(body.commissionSplitPct);
      if (!Number.isInteger(pct) || pct < 0 || pct > 100) throw new BadRequestException('Komisyon payı 0-100 arasında tam sayı olmalıdır.');
    }
    const target = await this.prisma.office.findUnique({ where: { code }, select: { id: true, name: true, ownerUserId: true } });
    if (!target) throw new NotFoundException('Bu kodla bir ofis bulunamadı.');
    if (target.id === office.id) throw new BadRequestException('Kendi ofisinizi davet edemezsiniz.');
    const elig = await eligibilityMap(this.prisma, [office.id, target.id]);
    if (!elig.get(office.id)) throw new BadRequestException('Kardeş ofis özelliği için ofis paketiniz uygun değil (Altın veya Platin gerekir).');
    if (!elig.get(target.id)) throw new BadRequestException('Davet ettiğiniz ofisin paketi kardeş ofis özelliğine uygun değil.');
    const [a, b] = sortedPair(office.id, target.id);
    const existing = await this.prisma.officeSisterLink.findUnique({ where: { officeAId_officeBId: { officeAId: a, officeBId: b } } });
    if (existing && OPEN_STATUSES.includes(existing.status)) throw new ConflictException('Bu ofisle zaten bir kardeş bağı veya bekleyen davet var.');
    const data = { status: SisterLinkStatus.BEKLIYOR, invitedByOfficeId: office.id, invitedByUserId: actor.id, commissionSplitPct: pct, createdAt: new Date(), respondedAt: null, endedAt: null, endedByUserId: null };
    let link;
    try {
      link = existing
        ? await this.prisma.officeSisterLink.update({ where: { id: existing.id }, data })
        : await this.prisma.officeSisterLink.create({ data: { officeAId: a, officeBId: b, ...data } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Bu ofisle zaten bir kardeş bağı veya bekleyen davet var.');
      throw error;
    }
    await safeNotify(this.notifications, target.ownerUserId, {
      type: 'SISTER_INVITE', priority: 'ACIL', title: 'Kardeş ofis daveti', body: `${office.name} sizi kardeş ofis olmaya davet etti.`,
      actionUrl: '/office', eventKey: `sister-invite:${link.id}:${link.createdAt.getTime()}`,
    });
    return { id: link.id, status: link.status, commissionSplitPct: pct };
  }

  private async loadLinkFor(officeId: string, linkId: string) {
    const link = await this.prisma.officeSisterLink.findUnique({ where: { id: linkId } });
    if (!link || (link.officeAId !== officeId && link.officeBId !== officeId)) throw new NotFoundException('Kardeş ofis bağı bulunamadı.');
    return link;
  }

  private async respond(userId: string, officeId: string, linkId: string, accept: boolean) {
    const { office, actor } = await resolveOfficeAccess(this.prisma, userId, officeId, { ownerOnly: true });
    const link = await this.loadLinkFor(office.id, linkId);
    if (link.invitedByOfficeId === office.id) throw new ForbiddenException('Daveti yalnız davet edilen ofisin sahibi yanıtlayabilir.');
    if (link.status !== SisterLinkStatus.BEKLIYOR) throw new BadRequestException('Bu davet artık beklemede değil.');
    const res = await this.prisma.officeSisterLink.updateMany({
      where: { id: link.id, status: SisterLinkStatus.BEKLIYOR },
      data: { status: accept ? SisterLinkStatus.AKTIF : SisterLinkStatus.REDDEDILDI, respondedAt: new Date() },
    });
    if (res.count === 0) throw new BadRequestException('Bu davet artık beklemede değil.');
    const inviter = await this.prisma.office.findUnique({ where: { id: link.invitedByOfficeId }, select: { ownerUserId: true } });
    await safeNotify(this.notifications, inviter?.ownerUserId, {
      type: accept ? 'SISTER_INVITE_ACCEPTED' : 'SISTER_INVITE_REJECTED',
      title: accept ? 'Kardeş ofis daveti kabul edildi' : 'Kardeş ofis daveti reddedildi',
      body: `${office.name} kardeş ofis davetinizi ${accept ? 'kabul etti' : 'reddetti'}.`,
      actionUrl: '/office', eventKey: `sister-invite-reply:${link.id}:${accept ? 'A' : 'R'}:${Date.now()}`,
    });
    return { id: link.id, status: accept ? SisterLinkStatus.AKTIF : SisterLinkStatus.REDDEDILDI, by: actor.id };
  }

  accept(userId: string, officeId: string, linkId: string) { return this.respond(userId, officeId, linkId, true); }
  reject(userId: string, officeId: string, linkId: string) { return this.respond(userId, officeId, linkId, false); }

  async end(userId: string, officeId: string, linkId: string) {
    const { office, actor } = await resolveOfficeAccess(this.prisma, userId, officeId, { ownerOnly: true });
    const link = await this.loadLinkFor(office.id, linkId);
    if (!OPEN_STATUSES.includes(link.status)) throw new BadRequestException('Bu bağ zaten aktif değil.');
    await this.prisma.officeSisterLink.update({ where: { id: link.id }, data: { status: SisterLinkStatus.SONLANDI, endedAt: new Date(), endedByUserId: actor.id } });
    return { id: link.id, status: SisterLinkStatus.SONLANDI };
  }
}
