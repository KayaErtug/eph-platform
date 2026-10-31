import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, SisterLinkStatus, SisterRequestStatus, UnitStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { redactPoolDeedOwnerText } from '../../units/pool-privacy';
import { SisterLinksService } from './sister-links.service';
import { eligibilityMap, fullName, officeUnitScope, RENT_STATUSES, resolveOfficeAccess, safeNotify, SALE_STATUSES, sortedPair } from './sister-shared';

// Danışman, iletişim ve konum bilgisi taşıyan meta özellikler kardeş ofise gösterilmez (pool-privacy ile aynı kural).
const PRIVATE_META = /(phone|whatsapp|owner|office|address|creditamount|dooraccess|latitude|longitude|placeid)/i;

@Injectable()
export class SisterPoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly links: SisterLinksService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async setShare(userId: string, officeId: string, unitId: string, shared: unknown) {
    if (typeof shared !== 'boolean') throw new BadRequestException('shared true veya false olmalıdır.');
    const { office } = await resolveOfficeAccess(this.prisma, userId, officeId, { ownerOnly: true });
    const unit = await this.prisma.unit.findFirst({
      where: { AND: [{ id: unitId }, { status: { not: UnitStatus.PASIF } }, officeUnitScope(office.id, office.ownerUserId)] },
      select: { id: true, hiddenFromOffice: true },
    });
    if (!unit) throw new NotFoundException('Portföy bulunamadı.');
    if (shared && unit.hiddenFromOffice) throw new BadRequestException('Ekipten gizlenen portföy kardeş ofislerle paylaşılamaz. Önce gizliliği kaldırın.');
    return this.prisma.unit.update({ where: { id: unitId }, data: { sharedWithSisters: shared }, select: { id: true, sharedWithSisters: true } });
  }

  async pool(userId: string, officeId: string, query: { officeId?: string; status?: string; q?: string; take?: string | number; cursor?: string } = {}) {
    const { office } = await resolveOfficeAccess(this.prisma, userId, officeId);
    const { partners, suspended } = await this.links.activePartners(office.id);
    if (!partners.length) return { items: [], nextCursor: null, suspended };
    let targets = partners;
    if (query.officeId) {
      targets = partners.filter(p => p.office.id === query.officeId);
      if (!targets.length) return { items: [], nextCursor: null, suspended };
    }
    const and: Prisma.UnitWhereInput[] = [
      { sharedWithSisters: true, hiddenFromOffice: false, status: { not: UnitStatus.PASIF } },
      { OR: targets.map(p => officeUnitScope(p.office.id, p.office.ownerUserId)) },
    ];
    if (query.status === 'sale') and.push({ status: { in: SALE_STATUSES } });
    else if (query.status === 'rent') and.push({ status: { in: RENT_STATUSES } });
    else if (query.status) throw new BadRequestException('status yalnız sale veya rent olabilir.');
    const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
    if (q) {
      const contains = { contains: q, mode: 'insensitive' as const };
      and.push({ OR: [{ roomCount: contains }, { project: { name: contains } }, { project: { neighborhood: contains } }, { project: { district: contains } }] });
    }
    const parsed = Number(query.take);
    const take = Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 100) : 50;
    const rows = await this.prisma.unit.findMany({
      where: { AND: and },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true, type: true, roomCount: true, netArea: true, grossArea: true, price: true, priceCurrency: true, status: true, updatedAt: true,
        images: { select: { url: true, supabaseUrl: true, isCover: true, sortOrder: true }, orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        project: { select: { name: true, city: true, district: true, neighborhood: true, ownerId: true, owner: { select: { officeId: true } } } },
      },
    });
    const page = rows.slice(0, take);
    const officeOf = (ownerId: string, ownerOfficeId: string | null) =>
      targets.find(p => p.office.id === ownerOfficeId)?.office ?? targets.find(p => p.office.ownerUserId === ownerId)?.office;
    return {
      items: page.map(u => {
        const cover = u.images[0];
        const o = officeOf(u.project.ownerId, u.project.owner.officeId);
        return {
          id: u.id, title: u.project.name, type: u.type, roomCount: u.roomCount, netArea: u.netArea, grossArea: u.grossArea,
          price: u.price, priceCurrency: u.priceCurrency, status: u.status,
          city: u.project.city, district: u.project.district, neighborhood: u.project.neighborhood,
          coverUrl: cover ? cover.supabaseUrl || cover.url : null,
          office: o ? { id: o.id, name: o.name, ownerName: fullName(o.owner), ownerPhone: o.owner?.phone ?? null } : null,
          updatedAt: u.updatedAt,
        };
      }),
      nextCursor: rows.length > take ? page[page.length - 1].id : null,
      suspended,
    };
  }

  // Birim, isteyen ofisin AKTIF ve askıda olmayan bir kardeş ofisinin paylaşılan ilanı mı? Değilse 404; askıdaysa 403.
  async loadSharedUnit(myOfficeId: string, unitId: string) {
    const u = await this.prisma.unit.findFirst({
      where: { id: unitId, sharedWithSisters: true, hiddenFromOffice: false, status: { not: UnitStatus.PASIF }, project: { isActive: true } },
      select: {
        id: true, description: true, type: true, roomCount: true, netArea: true, grossArea: true, floor: true, floorLabel: true, totalFloors: true,
        facades: true, features: true, price: true, priceCurrency: true, status: true, updatedAt: true,
        deedOwnerFullName: true, deedOwnerPhone: true, deedOwnerEmail: true, contactPhone: true, whatsappPhone: true, adaNo: true, parselNo: true,
        images: { select: { id: true, url: true, supabaseUrl: true }, orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }] },
        project: { select: { name: true, city: true, district: true, neighborhood: true, address: true, latitude: true, longitude: true, ownerId: true, owner: { select: { officeId: true } } } },
      },
    });
    if (!u) throw new NotFoundException('Portföy bulunamadı.');
    const ownerOfficeId = u.project.owner.officeId
      ?? (await this.prisma.office.findFirst({ where: { ownerUserId: u.project.ownerId }, select: { id: true } }))?.id
      ?? null;
    if (!ownerOfficeId || ownerOfficeId === myOfficeId) throw new NotFoundException('Portföy bulunamadı.');
    const [a, b] = sortedPair(myOfficeId, ownerOfficeId);
    const link = await this.prisma.officeSisterLink.findUnique({ where: { officeAId_officeBId: { officeAId: a, officeBId: b } } });
    if (!link || link.status !== SisterLinkStatus.AKTIF) throw new NotFoundException('Portföy bulunamadı.');
    const elig = await eligibilityMap(this.prisma, [myOfficeId, ownerOfficeId]);
    if (!elig.get(myOfficeId) || !elig.get(ownerOfficeId)) throw new ForbiddenException('Kardeş ofis bağı askıda: ofis paketi uygun değil.');
    const owner = await this.prisma.office.findUnique({ where: { id: ownerOfficeId }, select: { id: true, name: true, owner: { select: { firstName: true, lastName: true, phone: true } } } });
    return { unit: u, ownerOffice: owner! };
  }

  async detail(userId: string, officeId: string, unitId: string) {
    const { office, actor } = await resolveOfficeAccess(this.prisma, userId, officeId);
    const { unit: u, ownerOffice } = await this.loadSharedUnit(office.id, unitId);
    const features = (Array.isArray(u.features) ? u.features : []).filter(item => {
      const raw = String(item || '');
      if (!raw.startsWith('__EPH_META__:')) return true;
      let key = raw.slice('__EPH_META__:'.length).split(':')[0];
      try { key = decodeURIComponent(key); } catch { return false; }
      return !PRIVATE_META.test(key);
    }).map(item => (item.startsWith('__EPH_META__:') ? item : redactPoolDeedOwnerText(u, item) as string));

    const request = await this.prisma.sisterPrivateInfoRequest.findUnique({ where: { unitId_requesterUserId: { unitId: u.id, requesterUserId: actor.id } } });
    let privateInfo: { status: 'none' | 'pending' | 'approved' | 'rejected'; data?: Record<string, unknown> } = { status: 'none' };
    if (request) {
      if (request.status === SisterRequestStatus.BEKLIYOR) privateInfo = { status: 'pending' };
      else if (request.status === SisterRequestStatus.REDDEDILDI) privateInfo = { status: 'rejected' };
      else {
        await this.prisma.sisterPrivateInfoAccessLog.create({ data: { requestId: request.id, unitId: u.id, viewerUserId: actor.id } });
        privateInfo = {
          status: 'approved',
          data: {
            ownerFullName: u.deedOwnerFullName, ownerPhone: u.deedOwnerPhone || u.contactPhone || null, whatsappPhone: u.whatsappPhone,
            ownerEmail: u.deedOwnerEmail,
            location: { address: u.project.address, latitude: u.project.latitude, longitude: u.project.longitude, adaNo: u.adaNo, parselNo: u.parselNo },
          },
        };
      }
    }
    return {
      id: u.id, title: u.project.name, description: redactPoolDeedOwnerText(u, u.description), type: u.type, roomCount: u.roomCount,
      netArea: u.netArea, grossArea: u.grossArea, floor: u.floor, floorLabel: u.floorLabel, totalFloors: u.totalFloors, facades: u.facades, features,
      price: u.price, priceCurrency: u.priceCurrency, status: u.status,
      city: u.project.city, district: u.project.district, neighborhood: u.project.neighborhood,
      images: u.images.map(i => ({ id: i.id, url: i.supabaseUrl || i.url })),
      office: { id: ownerOffice.id, name: ownerOffice.name, ownerName: fullName(ownerOffice.owner), ownerPhone: ownerOffice.owner?.phone ?? null },
      updatedAt: u.updatedAt,
      privateInfo,
    };
  }

  async requestPrivateInfo(userId: string, officeId: string, unitId: string) {
    const { office, actor } = await resolveOfficeAccess(this.prisma, userId, officeId);
    const { unit, ownerOffice } = await this.loadSharedUnit(office.id, unitId);
    const key = { unitId_requesterUserId: { unitId: unit.id, requesterUserId: actor.id } };
    const existing = await this.prisma.sisterPrivateInfoRequest.findUnique({ where: key });
    if (existing && existing.status !== SisterRequestStatus.REDDEDILDI) return { id: existing.id, status: existing.status };
    const reset = { status: SisterRequestStatus.BEKLIYOR, ownerOfficeId: ownerOffice.id, requesterOfficeId: office.id, decidedByUserId: null, decidedAt: null, createdAt: new Date() };
    let req;
    try {
      req = existing
        ? await this.prisma.sisterPrivateInfoRequest.update({ where: { id: existing.id }, data: reset })
        : await this.prisma.sisterPrivateInfoRequest.create({ data: { unitId: unit.id, requesterUserId: actor.id, ...reset } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const again = await this.prisma.sisterPrivateInfoRequest.findUnique({ where: key });
        if (again) return { id: again.id, status: again.status };
      }
      throw error;
    }
    const target = await this.prisma.office.findUnique({ where: { id: ownerOffice.id }, select: { ownerUserId: true } });
    await safeNotify(this.notifications, target?.ownerUserId, {
      type: 'SISTER_PRIVATE_REQUEST', priority: 'ACIL', title: 'Özel bilgi isteği', body: `${office.name} bir ilanınızın özel bilgilerini görmek istiyor.`,
      actionUrl: '/office', eventKey: `sister-private-request:${req.id}:${req.createdAt.getTime()}`,
    });
    return { id: req.id, status: req.status };
  }
}
