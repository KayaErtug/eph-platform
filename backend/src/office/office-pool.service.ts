import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, UnitStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { serializePoolPrivateInfo } from '../units/pool-privacy';

const SALE_STATUSES: UnitStatus[] = [UnitStatus.SATILIK, UnitStatus.DEVREN_SATILIK];
const RENT_STATUSES: UnitStatus[] = [UnitStatus.KIRALIK, UnitStatus.GUNLUK_KIRALIK];
const PRIVATE_KEY = /(deedowner|dooraccess|phone|whatsapp|email|latitude|longitude|placeid|address|adano|parselno|^number$|creditamount|allowphone|allowwhatsapp)/i;

@Injectable()
export class OfficePoolService {
  constructor(private readonly prisma: PrismaService) {}

  private async access(userId: string, officeId: string) {
    const office = await this.prisma.office.findUnique({ where: { id: officeId } });
    if (!office) throw new NotFoundException('Ofis bulunamadı.');
    const isOwner = office.ownerUserId === userId;
    const isMember = isOwner || !!(await this.prisma.user.findFirst({ where: { id: userId, officeId } }));
    const isSuper = !isMember && !!(await this.prisma.user.findFirst({ where: { id: userId, role: Role.SUPER_ADMIN }, select: { id: true } }));
    if (!isMember && !isSuper) throw new ForbiddenException('Bu ofisin ortak portföy havuzuna erişim yetkiniz yok.');
    return { office, isOwner: isOwner || isSuper, isSuper };
  }

  // Shared by list and detail so both apply the same scope and visibility rule.
  private scope(userId: string, officeId: string, office: { ownerUserId: string | null }, isOwner: boolean): Prisma.UnitWhereInput[] {
    const and: Prisma.UnitWhereInput[] = [
      { status: { not: UnitStatus.PASIF } },
      { project: { isActive: true, OR: [{ owner: { officeId } }, ...(office.ownerUserId ? [{ ownerId: office.ownerUserId }] : [])] } },
    ];
    if (!isOwner) and.push({ OR: [{ hiddenFromOffice: false }, { project: { ownerId: userId } }] });
    return and;
  }

  async pool(userId: string, officeId: string, query: { status?: string; q?: string; advisorId?: string; take?: string | number; cursor?: string } = {}) {
    const { office, isOwner, isSuper } = await this.access(userId, officeId);
    const and = this.scope(userId, officeId, office, isOwner);
    if (query.status === 'sale') and.push({ status: { in: SALE_STATUSES } });
    else if (query.status === 'rent') and.push({ status: { in: RENT_STATUSES } });
    else if (query.status) throw new BadRequestException('status yalnız sale veya rent olabilir.');
    const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
    if (q) {
      const contains = { contains: q, mode: 'insensitive' as const };
      and.push({ OR: [{ roomCount: contains }, { project: { name: contains } }, { project: { neighborhood: contains } }, { project: { district: contains } }] });
    }
    const advisorId = typeof query.advisorId === 'string' ? query.advisorId.trim() : '';
    if (advisorId) {
      and.push({ OR: [{ salesRepresentativeId: advisorId }, { project: { ownerId: advisorId } }] });
    }
    const parsed = Number(query.take);
    const take = Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 100) : 50;
    const rows = await this.prisma.unit.findMany({
      where: { AND: and },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true, type: true, roomCount: true, netArea: true, grossArea: true, price: true, priceCurrency: true,
        status: true, hiddenFromOffice: true, sharedWithSisters: true, updatedAt: true, salesRepresentativeId: true,
        images: { select: { url: true, supabaseUrl: true, isCover: true, sortOrder: true }, orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }] },
        mediaPackage: { select: { assets: { select: { url: true, supabaseUrl: true, isCover: true, sortOrder: true }, orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }] } } },
        salesRepresentative: { select: { id: true, firstName: true, lastName: true } },
        project: {
          select: {
            name: true, city: true, district: true, neighborhood: true, ownerId: true,
            owner: { select: { id: true, firstName: true, lastName: true } },
            mediaPackages: { select: { assets: { select: { url: true, supabaseUrl: true, isCover: true, sortOrder: true }, orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }] } } },
          },
        },
      },
    });
    const page = rows.slice(0, take);
    return {
      items: page.map(u => {
        const rawImages = [
          ...(u.images || []),
          ...(u.mediaPackage?.assets || []),
          ...(u.project?.mediaPackages?.flatMap(m => m.assets || []) || []),
        ];
        const uniqueUrls = new Set<string>();
        const combinedImages: Array<{ url: string; supabaseUrl?: string; isCover?: boolean }> = [];
        for (const img of rawImages) {
          const url = img.supabaseUrl || img.url;
          if (url && !uniqueUrls.has(url)) {
            uniqueUrls.add(url);
            combinedImages.push({ url, supabaseUrl: img.supabaseUrl, isCover: Boolean(img.isCover) });
          }
        }
        const cover = combinedImages.find(img => img.isCover) || combinedImages[0];
        const owner = u.project.owner;
        const activeAdvisor = u.salesRepresentative || owner;
        return {
          id: u.id, title: u.project.name, type: u.type, roomCount: u.roomCount, netArea: u.netArea, grossArea: u.grossArea,
          price: u.price, priceCurrency: u.priceCurrency, status: u.status,
          city: u.project.city, district: u.project.district, neighborhood: u.project.neighborhood,
          coverUrl: cover ? cover.supabaseUrl || cover.url : null,
          images: combinedImages,
          agent: { id: activeAdvisor.id, fullName: `${activeAdvisor.firstName ?? ''} ${activeAdvisor.lastName ?? ''}`.trim() },
          hiddenFromOffice: u.hiddenFromOffice, sharedWithSisters: isOwner && u.sharedWithSisters === true,
          isMine: u.project.ownerId === userId, updatedAt: u.updatedAt,
        };
      }),
      nextCursor: rows.length > take ? page[page.length - 1].id : null,
    };
  }

  async detail(userId: string, officeId: string, unitId: string) {
    const { office, isOwner, isSuper } = await this.access(userId, officeId);
    const u = await this.prisma.unit.findFirst({
      where: { AND: [{ id: unitId }, ...this.scope(userId, officeId, office, isOwner)] },
      include: {
        images: { select: { id: true, url: true, supabaseUrl: true, isCover: true }, orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }] },
        mediaPackage: { select: { assets: { select: { id: true, url: true, supabaseUrl: true, isCover: true }, orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }] } } },
        salesRepresentative: { select: { id: true, firstName: true, lastName: true, phone: true } },
        project: {
          select: {
            name: true, city: true, district: true, neighborhood: true, ownerId: true,
            owner: { select: { id: true, firstName: true, lastName: true, phone: true } },
            mediaPackages: { select: { assets: { select: { id: true, url: true, supabaseUrl: true, isCover: true }, orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }] } } },
          },
        },
      },
    });
    if (!u) throw new NotFoundException('Portföy bulunamadı.');
    const owner = u.project.owner;
    const activeAdvisor = u.salesRepresentative || owner;
    // EPH-17/onlu kart: Temel Bilgiler kartı için tüm portföy alanları; özel bilgiler (tapu sahibi, iletişim, konum, ada/parsel) çıkarılır.
    const { images, mediaPackage, project, salesRepresentative, ...scalars } = u as any;
    const safe: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(scalars)) {
      if (!isSuper && PRIVATE_KEY.test(key)) continue;
      safe[key] = value;
    }
    const rawImages = [
      ...(images || []),
      ...(mediaPackage?.assets || []),
      ...(project?.mediaPackages?.flatMap((m: any) => m.assets || []) || []),
    ];
    const uniqueUrls = new Set<string>();
    const resolvedImages: Array<{ id?: string; url: string; isCover?: boolean }> = [];
    for (const img of rawImages) {
      const url = img.supabaseUrl || img.url;
      if (url && !uniqueUrls.has(url)) {
        uniqueUrls.add(url);
        resolvedImages.push({ id: img.id, url });
      }
    }
    return {
      ...safe,
      ...(isSuper ? { ...scalars, deedOwnerFullName: u.deedOwnerFullName, privateUnlocked: true } : {}),
      id: u.id, title: project.name,
      city: project.city, district: project.district, neighborhood: project.neighborhood,
      project: { name: project.name, city: project.city, district: project.district, neighborhood: project.neighborhood },
      images: resolvedImages,
      agent: { id: activeAdvisor.id, fullName: `${activeAdvisor.firstName ?? ''} ${activeAdvisor.lastName ?? ''}`.trim(), phone: activeAdvisor.phone },
      hiddenFromOffice: u.hiddenFromOffice, isMine: project.ownerId === userId, updatedAt: u.updatedAt,
    };
  }

  async setVisibility(userId: string, officeId: string, unitId: string, hidden: unknown) {
    if (typeof hidden !== 'boolean') throw new BadRequestException('hidden true veya false olmalıdır.');
    const { office, isSuper } = await this.access(userId, officeId);
    const unit = await this.prisma.unit.findFirst({
      where: {
        AND: [
          { id: unitId },
          { project: { OR: [{ owner: { officeId } }, ...(office.ownerUserId ? [{ ownerId: office.ownerUserId }] : [])] } },
        ],
      },
      select: { id: true, project: { select: { ownerId: true } } },
    });
    if (!unit) throw new NotFoundException('Portföy bulunamadı.');
    if (!isSuper && unit.project.ownerId !== userId) throw new ForbiddenException('Yalnız portföyün sahibi ekipten gizleyebilir.');
    return this.prisma.unit.update({ where: { id: unitId }, data: hidden ? { hiddenFromOffice: true, sharedWithSisters: false } : { hiddenFromOffice: false }, select: { id: true, hiddenFromOffice: true } });
  }
}
