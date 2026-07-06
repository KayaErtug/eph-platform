import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProjectMediaPackageType,
  Role,
  UnitType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const COMMERCIAL_UNIT_TYPES = new Set<UnitType>([
  UnitType.DUKKAN_MAGAZA,
  UnitType.OFIS_BURO,
  UnitType.PLAZA_KATI,
  UnitType.DEPO_ANTREPO,
  UnitType.FABRIKA_ATOLYE,
  UnitType.OTEL_PANSIYON,
  UnitType.DUGUN_SALONU,
  UnitType.TURISTIK_TESIS,
  UnitType.HOME_OFFICE,
  UnitType.SHOWROOM,
  UnitType.IS_HANI_KATI,
  UnitType.IS_MERKEZI,
]);

const UNIT_TYPE_LABELS: Partial<Record<UnitType, string>> = {
  [UnitType.DAIRE]: 'Daire',
  [UnitType.VILLA]: 'Villa',
  [UnitType.REZIDANS]: 'Rezidans',
  [UnitType.MUSTAK_EV]: 'Müstakil Ev',
  [UnitType.DUKKAN_MAGAZA]: 'Dükkan / Mağaza',
  [UnitType.OFIS_BURO]: 'Ofis / Büro',
  [UnitType.PLAZA_KATI]: 'Plaza Katı',
  [UnitType.DEPO_ANTREPO]: 'Depo / Antrepo',
  [UnitType.FABRIKA_ATOLYE]: 'Fabrika / Atölye',
  [UnitType.OTEL_PANSIYON]: 'Otel / Pansiyon',
  [UnitType.TURISTIK_TESIS]: 'Turistik Tesis',
  [UnitType.HOME_OFFICE]: 'Home Office',
  [UnitType.SHOWROOM]: 'Showroom',
  [UnitType.IS_HANI_KATI]: 'İş Hanı Katı',
  [UnitType.IS_MERKEZI]: 'İş Merkezi',
};

type UnitGroup = {
  unitType: UnitType;
  roomCount: string | null;
  unitCount: number;
};

@Injectable()
export class ProjectSalesMediaSetupService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureMediaPackages(
    projectId: string,
    userId: string,
    userRole: Role,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        ownerId: true,
        code: true,
        name: true,
        setupStatus: true,
        units: {
          where: { isSalesInventory: true },
          select: {
            id: true,
            type: true,
            roomCount: true,
          },
          orderBy: { inventorySortOrder: 'asc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    this.ensureProjectAccess(project.ownerId, userId, userRole);

    if (project.units.length === 0) {
      throw new BadRequestException(
        'Fotoğraf paketleri için satış stokunda bağımsız bölüm bulunmalıdır.',
      );
    }

    const projectCode =
      project.code || `EPH-${project.id.slice(0, 8).toUpperCase()}`;

    if (!project.code) {
      await this.prisma.project.update({
        where: { id: project.id },
        data: { code: projectCode },
      });
    }

    const groups = this.groupUnits(
      project.units.map((unit) => ({
        unitType: unit.type,
        roomCount: this.cleanRoomCount(unit.roomCount),
      })),
    );

    const transactionResult = await this.prisma.$transaction(
      async (transaction) => {
        const generalPackage =
          await transaction.projectMediaPackage.upsert({
            where: {
              projectId_code: {
                projectId: project.id,
                code: 'AUTO_PROJE_GENEL',
              },
            },
            update: {
              name: 'Proje Genel Görselleri',
              type: ProjectMediaPackageType.PROJECT_GENERAL,
              unitType: null,
              roomCount: null,
              isDefault: true,
              isActive: true,
              sortOrder: 0,
            },
            create: {
              projectId: project.id,
              code: 'AUTO_PROJE_GENEL',
              name: 'Proje Genel Görselleri',
              type: ProjectMediaPackageType.PROJECT_GENERAL,
              isDefault: true,
              isActive: true,
              sortOrder: 0,
            },
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
            },
          });

        const packages = [
          {
            ...generalPackage,
            unitType: null,
            roomCount: null,
            assignedUnitCount: 0,
          },
        ];
        let assignedUnitCount = 0;

        for (let index = 0; index < groups.length; index += 1) {
          const group = groups[index];
          const roomLabel = group.roomCount || 'Standart';
          const packageCode = this.packageCode(
            group.unitType,
            group.roomCount,
          );
          const packageType = COMMERCIAL_UNIT_TYPES.has(group.unitType)
            ? ProjectMediaPackageType.COMMERCIAL_STANDARD
            : ProjectMediaPackageType.UNIT_STANDARD;

          const mediaPackage =
            await transaction.projectMediaPackage.upsert({
              where: {
                projectId_code: {
                  projectId: project.id,
                  code: packageCode,
                },
              },
              update: {
                name: `${this.unitTypeLabel(group.unitType)} ${roomLabel} Görselleri`,
                type: packageType,
                unitType: group.unitType,
                roomCount: group.roomCount,
                isDefault: false,
                isActive: true,
                sortOrder: index + 10,
              },
              create: {
                projectId: project.id,
                code: packageCode,
                name: `${this.unitTypeLabel(group.unitType)} ${roomLabel} Görselleri`,
                type: packageType,
                unitType: group.unitType,
                roomCount: group.roomCount,
                isDefault: false,
                isActive: true,
                sortOrder: index + 10,
              },
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                unitType: true,
                roomCount: true,
              },
            });

          const updateResult = await transaction.unit.updateMany({
            where: {
              projectId: project.id,
              isSalesInventory: true,
              type: group.unitType,
              roomCount: group.roomCount,
            },
            data: {
              mediaPackageId: mediaPackage.id,
            },
          });

          assignedUnitCount += updateResult.count;
          packages.push({
            ...mediaPackage,
            assignedUnitCount: updateResult.count,
          });
        }

        return {
          packages,
          assignedUnitCount,
        };
      },
      {
        maxWait: 10_000,
        timeout: 30_000,
      },
    );

    return {
      success: true,
      project: {
        id: project.id,
        code: projectCode,
        name: project.name,
        setupStatus: project.setupStatus,
      },
      summary: {
        packageCount: transactionResult.packages.length,
        standardPackageCount: Math.max(
          transactionResult.packages.length - 1,
          0,
        ),
        assignedUnitCount: transactionResult.assignedUnitCount,
      },
      packages: transactionResult.packages,
    };
  }

  private groupUnits(
    units: Array<{
      unitType: UnitType;
      roomCount: string | null;
    }>,
  ) {
    const map = new Map<string, UnitGroup>();

    for (const unit of units) {
      const key = `${unit.unitType}::${unit.roomCount || ''}`;
      const current = map.get(key);

      if (current) {
        current.unitCount += 1;
      } else {
        map.set(key, {
          unitType: unit.unitType,
          roomCount: unit.roomCount,
          unitCount: 1,
        });
      }
    }

    return Array.from(map.values()).sort((first, second) => {
      const firstKey = `${first.unitType}-${first.roomCount || ''}`;
      const secondKey = `${second.unitType}-${second.roomCount || ''}`;

      return firstKey.localeCompare(secondKey, 'tr');
    });
  }

  private packageCode(
    unitType: UnitType,
    roomCount: string | null,
  ) {
    const roomCode = this.asciiCode(roomCount || 'STANDART');

    return `AUTO_${this.asciiCode(unitType)}_${roomCode}`;
  }

  private unitTypeLabel(unitType: UnitType) {
    return (
      UNIT_TYPE_LABELS[unitType] ||
      String(unitType)
        .replaceAll('_', ' ')
        .toLocaleLowerCase('tr-TR')
        .replace(/(^|\s)\S/g, (letter) =>
          letter.toLocaleUpperCase('tr-TR'),
        )
    );
  }

  private cleanRoomCount(value: string | null) {
    const clean = String(value || '').trim();

    return clean || null;
  }

  private asciiCode(value: string) {
    return String(value || '')
      .trim()
      .toLocaleUpperCase('tr-TR')
      .replace(/İ/g, 'I')
      .replace(/Ş/g, 'S')
      .replace(/Ğ/g, 'G')
      .replace(/Ü/g, 'U')
      .replace(/Ö/g, 'O')
      .replace(/Ç/g, 'C')
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48);
  }

  private ensureProjectAccess(
    ownerId: string,
    userId: string,
    userRole: Role,
  ) {
    if (ownerId === userId || userRole === Role.SUPER_ADMIN) {
      return;
    }

    throw new ForbiddenException(
      'Bu projenin görsel paketlerini yönetme yetkiniz yok.',
    );
  }
}
