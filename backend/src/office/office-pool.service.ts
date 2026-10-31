import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, UnitStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SALE_STATUSES: UnitStatus[] = [UnitStatus.SATILIK, UnitStatus.DEVREN_SATILIK];
const RENT_STATUSES: UnitStatus[] = [UnitStatus.KIRALIK, UnitStatus.GUNLUK_KIRALIK];

@Injectable()
export class OfficePoolService {
  constructor(private readonly prisma: PrismaService) {}

  private async access(userId: string, officeId: string) {
    const office = await this.prisma.office.findUnique({ where: { id: officeId } });
    if (!office) throw new NotFoundException('Ofis bulunamadı.');
    const isOwner = office.ownerUserId === userId;
    const isMember = isOwner || !!(await this.prisma.user.findFirst({ where: { id: userId, officeId } }));
    if (!isMember && (await this.prisma.user.findFirst({ where: { id: userId, role: Role.SUPER_ADMIN }, select: { id: true } }))) return { office, isOwner: true };
    if (!isMember) throw new ForbiddenException('Bu ofisin ortak portföy havuzuna erişim yetkiniz yok.');
    return { office, isOwner };
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

  async pool(userId: string, officeId: string, query: { status?: string; q?: string; take?: string | number; cursor?: string } = {}) {
    const { office, isOwner } = await this.access(userId, officeId);
    const and = this.scope(userId, officeId, office, isOwner);
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
        id: true, type: true, roomCount: true, netArea: true, grossArea: true, price: true, priceCurrency: true,
        status: true, hiddenFromOffice: true, sharedWithSisters: true, updatedAt: true,
        images: { select: { url: true, supabaseUrl: true, isCover: true, sortOrder: true }, orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        project: { select: { name: true, city: true, district: true, neighborhood: true, ownerId: true, owner: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });
    const page = rows.slice(0, take);
    return {
      items: page.map(u => {
        const cover = u.images[0];
        const owner = u.project.owner;
        return {
          id: u.id, title: u.project.name, type: u.type, roomCount: u.roomCount, netArea: u.netArea, grossArea: u.grossArea,
          price: u.price, priceCurrency: u.priceCurrency, status: u.status,
          city: u.project.city, district: u.project.district, neighborhood: u.project.neighborhood,
          coverUrl: cover ? cover.supabaseUrl || cover.url : null,
          agent: { id: owner.id, fullName: `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() },
          hiddenFromOffice: u.hiddenFromOffice, sharedWithSisters: isOwner && u.sharedWithSisters === true,
          isMine: u.project.ownerId === userId, updatedAt: u.updatedAt,
        };
      }),
      nextCursor: rows.length > take ? page[page.length - 1].id : null,
    };
  }

  async detail(userId: string, officeId: string, unitId: string) {
    const { office, isOwner } = await this.access(userId, officeId);
    const u = await this.prisma.unit.findFirst({
      where: { AND: [{ id: unitId }, ...this.scope(userId, officeId, office, isOwner)] },
      select: {
        id: true, description: true, type: true, roomCount: true, netArea: true, grossArea: true, floor: true, floorLabel: true,
        totalFloors: true, facades: true, features: true, price: true, priceCurrency: true, status: true, hiddenFromOffice: true, updatedAt: true,
        images: { select: { id: true, url: true, supabaseUrl: true }, orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }] },
        project: { select: { name: true, city: true, district: true, neighborhood: true, ownerId: true, owner: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
      },
    });
    if (!u) throw new NotFoundException('Portföy bulunamadı.');
    const owner = u.project.owner;
    return {
      id: u.id, title: u.project.name, description: u.description, type: u.type, roomCount: u.roomCount, netArea: u.netArea, grossArea: u.grossArea,
      floor: u.floor, floorLabel: u.floorLabel, totalFloors: u.totalFloors, facades: u.facades, features: u.features,
      price: u.price, priceCurrency: u.priceCurrency, status: u.status,
      city: u.project.city, district: u.project.district, neighborhood: u.project.neighborhood,
      images: u.images.map(i => ({ id: i.id, url: i.supabaseUrl || i.url })),
      agent: { id: owner.id, fullName: `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim(), phone: owner.phone },
      hiddenFromOffice: u.hiddenFromOffice, isMine: u.project.ownerId === userId, updatedAt: u.updatedAt,
    };
  }

  async setVisibility(userId: string, officeId: string, unitId: string, hidden: unknown) {
    if (typeof hidden !== 'boolean') throw new BadRequestException('hidden true veya false olmalıdır.');
    await this.access(userId, officeId);
    const unit = await this.prisma.unit.findUnique({ where: { id: unitId }, select: { id: true, project: { select: { ownerId: true } } } });
    if (!unit) throw new NotFoundException('Portföy bulunamadı.');
    if (unit.project.ownerId !== userId) throw new ForbiddenException('Yalnız portföyün sahibi ekipten gizleyebilir.');
    return this.prisma.unit.update({ where: { id: unitId }, data: hidden ? { hiddenFromOffice: true, sharedWithSisters: false } : { hiddenFromOffice: false }, select: { id: true, hiddenFromOffice: true } });
  }
}
