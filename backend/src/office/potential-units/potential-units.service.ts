import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PotentialUnit,
  PotentialUnitSource,
  PotentialUnitStatus,
  PotentialUnitType,
  Prisma,
  Role,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import {
  ConvertPotentialUnitDto,
  CreatePotentialUnitDto,
  UpdatePotentialUnitStatusDto,
} from './dto/create-potential-unit.dto';

function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

@Injectable()
export class PotentialUnitsService {
  private readonly storageBucket =
    process.env.SUPABASE_STORAGE_BUCKET || 'portfolio-images';

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private isSuperAdmin(user: { role?: Role | string }) {
    return user?.role === Role.SUPER_ADMIN || user?.role === 'SUPER_ADMIN';
  }

  private isOfficeBoy(user: { role?: Role | string }) {
    return user?.role === Role.OFIS_BOY || user?.role === 'OFIS_BOY';
  }

  async list(
    user: { id: string; role?: Role | string; officeId?: string | null },
    query?: {
      officeId?: string;
      status?: PotentialUnitStatus;
      type?: PotentialUnitType;
      sourceType?: PotentialUnitSource;
      createdById?: string;
      assignedUserId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const isSuper = this.isSuperAdmin(user);
    const isBoy = this.isOfficeBoy(user);
    const where: Prisma.PotentialUnitWhereInput = {};

    if (query?.status) where.status = query.status;
    if (query?.type) where.type = query.type;
    if (query?.sourceType) where.sourceType = query.sourceType;
    if (query?.createdById) where.createdById = query.createdById;
    if (query?.assignedUserId) where.assignedUserId = query.assignedUserId;

    if (query?.search) {
      where.OR = [
        { formattedAddress: { contains: query.search, mode: 'insensitive' } },
        { neighborhood: { contains: query.search, mode: 'insensitive' } },
        { street: { contains: query.search, mode: 'insensitive' } },
        { contactPhone: { contains: query.search } },
        { contactName: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (!isSuper) {
      if (isBoy) {
        where.OR = [
          { createdById: user.id },
          ...(user.officeId ? [{ officeId: user.officeId }] : []),
        ];
      } else {
        const targetOfficeId = query?.officeId || user.officeId;
        if (targetOfficeId) {
          where.officeId = targetOfficeId;
        } else {
          where.createdById = user.id;
        }
      }
    } else if (query?.officeId) {
      where.officeId = query.officeId;
    }

    const take = Math.min(Math.max(Number(query?.limit || 50), 1), 100);
    const skip = Math.max(Number(query?.offset || 0), 0);

    const [items, total] = await Promise.all([
      this.prisma.potentialUnit.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              role: true,
              profileImageUrl: true,
            },
          },
          assignedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.potentialUnit.count({ where }),
    ]);

    return { items, total, limit: take, offset: skip };
  }

  async getById(
    id: string,
    user: { id: string; role?: Role | string; officeId?: string | null },
  ) {
    const unit = await this.prisma.potentialUnit.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            profileImageUrl: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        office: {
          select: {
            id: true,
            name: true,
            city: true,
            district: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Potansiyel portföy kaydı bulunamadı.');
    }

    if (!this.isSuperAdmin(user)) {
      if (this.isOfficeBoy(user) && unit.createdById !== user.id && unit.officeId !== user.officeId) {
        throw new ForbiddenException('Bu kayda erişim yetkiniz yok.');
      }
      if (!this.isOfficeBoy(user) && unit.officeId !== user.officeId && unit.createdById !== user.id) {
        throw new ForbiddenException('Bu kayda erişim yetkiniz yok.');
      }
    }

    return unit;
  }

  async create(
    user: { id: string; role?: Role | string; officeId?: string | null },
    dto: CreatePotentialUnitDto,
  ) {
    if (typeof dto.latitude !== 'number' || typeof dto.longitude !== 'number') {
      throw new BadRequestException('Geçerli GPS koordinatları gereklidir.');
    }

    let officeId = dto.officeId;
    if (!officeId || !this.isSuperAdmin(user)) {
      if (user.officeId) {
        officeId = user.officeId;
      } else {
        const dbUser = await this.prisma.user.findUnique({
          where: { id: user.id },
          select: { officeId: true },
        });
        officeId = dbUser?.officeId || undefined;
      }
    }

    if (!officeId) {
      throw new BadRequestException(
        'Potansiyel portföy oluşturmak için bir ofise bağlı olmanız gerekir.',
      );
    }

    const nearby = await this.findNearbyInternal(
      officeId,
      dto.latitude,
      dto.longitude,
      50,
    );

    const isDuplicate = nearby.length > 0;

    const created = await this.prisma.potentialUnit.create({
      data: {
        officeId,
        createdById: user.id,
        type: dto.type || PotentialUnitType.SATILIK,
        sourceType: dto.sourceType || PotentialUnitSource.SAHIBINDEN,
        contactPhone: dto.contactPhone?.trim(),
        contactName: dto.contactName?.trim(),
        photos: Array.isArray(dto.photos) ? dto.photos : [],
        latitude: dto.latitude,
        longitude: dto.longitude,
        city: dto.city?.trim(),
        district: dto.district?.trim(),
        neighborhood: dto.neighborhood?.trim(),
        street: dto.street?.trim(),
        buildingNo: dto.buildingNo?.trim(),
        formattedAddress: dto.formattedAddress?.trim(),
        addressNotes: dto.addressNotes?.trim(),
        description: dto.description?.trim(),
        status: PotentialUnitStatus.YENI,
        hunterPoints: 10,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    return {
      unit: created,
      duplicateWarning: isDuplicate
        ? `${nearby.length} adet yakın konumlu kayıt bulundu.`
        : null,
      message: 'Potansiyel portföy başarıyla sisteme kaydedildi.',
    };
  }

  async getNearby(
    user: { id: string; role?: Role | string; officeId?: string | null },
    latitude: number,
    longitude: number,
    radiusMeters = 100,
  ) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new BadRequestException('Geçerli koordinatlar gereklidir.');
    }

    const officeId = user.officeId || undefined;
    return this.findNearbyInternal(officeId, latitude, longitude, radiusMeters);
  }

  private async findNearbyInternal(
    officeId: string | undefined,
    latitude: number,
    longitude: number,
    radiusMeters: number,
  ) {
    const degDelta = (radiusMeters / 111000) * 1.5;
    const candidates = await this.prisma.potentialUnit.findMany({
      where: {
        ...(officeId ? { officeId } : {}),
        latitude: { gte: latitude - degDelta, lte: latitude + degDelta },
        longitude: { gte: longitude - degDelta, lte: longitude + degDelta },
      },
      select: {
        id: true,
        formattedAddress: true,
        neighborhood: true,
        street: true,
        contactPhone: true,
        type: true,
        status: true,
        latitude: true,
        longitude: true,
        createdAt: true,
      },
      take: 20,
    });

    return candidates
      .map((item) => {
        const dist = calculateDistanceMeters(
          latitude,
          longitude,
          item.latitude,
          item.longitude,
        );
        return { ...item, distanceMeters: dist };
      })
      .filter((item) => item.distanceMeters <= radiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  async updateStatus(
    id: string,
    user: { id: string; role?: Role | string; officeId?: string | null },
    dto: UpdatePotentialUnitStatusDto,
  ) {
    const existing = await this.getById(id, user);

    const updated = await this.prisma.potentialUnit.update({
      where: { id },
      data: {
        status: dto.status,
        statusNote: dto.statusNote !== undefined ? dto.statusNote : existing.statusNote,
        assignedUserId:
          dto.assignedUserId !== undefined
            ? dto.assignedUserId
            : existing.assignedUserId,
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    return {
      unit: updated,
      message: 'Potansiyel portföy durumu güncellendi.',
    };
  }

  async convertToUnit(
    id: string,
    user: { id: string; role?: Role | string; officeId?: string | null },
    dto: ConvertPotentialUnitDto,
  ) {
    const potential = await this.getById(id, user);

    if (potential.status === PotentialUnitStatus.DONUSTURULDU) {
      throw new BadRequestException('Bu kayıt zaten resmi portföye dönüştürülmüş.');
    }

    const updated = await this.prisma.potentialUnit.update({
      where: { id },
      data: {
        status: PotentialUnitStatus.DONUSTURULDU,
        hunterPoints: (potential.hunterPoints || 10) + 50,
        statusNote: 'Resmi EPH portföyüne aktarıldı.',
        assignedUserId: dto.assignedUserId || user.id,
      },
    });

    return {
      potentialUnit: updated,
      draftPortfolio: {
        title: `${potential.neighborhood || ''} ${potential.street || ''} ${potential.type === PotentialUnitType.KIRALIK ? 'Kiralık' : 'Satılık'}`.trim(),
        type: potential.type,
        city: potential.city,
        district: potential.district,
        neighborhood: potential.neighborhood,
        street: potential.street,
        buildingNo: potential.buildingNo,
        formattedAddress: potential.formattedAddress,
        latitude: potential.latitude,
        longitude: potential.longitude,
        contactPhone: potential.contactPhone,
        contactName: potential.contactName,
        photos: potential.photos,
        description: potential.description,
        price: dto.price || 0,
        roomCount: dto.roomCount,
        netArea: dto.netArea,
        grossArea: dto.grossArea,
      },
      message: 'Potansiyel portföy resmi ilana dönüştürüldü ve avcı bonusu verildi.',
    };
  }

  async getStats(
    user: { id: string; role?: Role | string; officeId?: string | null },
  ) {
    const isSuper = this.isSuperAdmin(user);
    const isBoy = this.isOfficeBoy(user);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const baseWhere: Prisma.PotentialUnitWhereInput = {};
    if (!isSuper) {
      if (isBoy) {
        baseWhere.createdById = user.id;
      } else if (user.officeId) {
        baseWhere.officeId = user.officeId;
      } else {
        baseWhere.createdById = user.id;
      }
    }

    const [todayCount, totalCount, convertedCount, followUpCount, pointsAggregate] =
      await Promise.all([
        this.prisma.potentialUnit.count({
          where: { ...baseWhere, createdAt: { gte: todayStart } },
        }),
        this.prisma.potentialUnit.count({ where: baseWhere }),
        this.prisma.potentialUnit.count({
          where: { ...baseWhere, status: PotentialUnitStatus.DONUSTURULDU },
        }),
        this.prisma.potentialUnit.count({
          where: { ...baseWhere, status: PotentialUnitStatus.TAKIPTE },
        }),
        this.prisma.potentialUnit.aggregate({
          where: isBoy ? { createdById: user.id } : baseWhere,
          _sum: { hunterPoints: true },
        }),
      ]);

    return {
      todayCount,
      totalCount,
      convertedCount,
      followUpCount,
      totalPoints: pointsAggregate._sum.hunterPoints || 0,
      isOfficeBoy: isBoy,
    };
  }

  async uploadPhoto(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Yüklenecek görsel dosyası bulunamadı.');
    }

    const ext = (file.originalname?.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `potential-units/${randomUUID()}.${ext}`;

    await this.supabaseService.uploadFile(
      this.storageBucket,
      fileName,
      file.buffer,
      file.mimetype || 'image/jpeg',
    );

    const url = this.supabaseService.getPublicUrl(this.storageBucket, fileName);
    return { url };
  }
}
