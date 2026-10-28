import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PoolAudienceMode,
  Prisma,
  Role,
  UyelikDurumu,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { assertNoBlockedInteraction, blockedPeerIds } from '../content-safety/block-policy';

type CurrentUser = {
  id: string;
  role?: Role | string;
};

export type AudienceInput = {
  mode?: 'PUBLIC' | 'TARGETED';
  roles?: string[];
  groupIds?: string[];
};

const AUDIENCE_ROLES: Role[] = [
  Role.EMLAKCI,
  Role.MUTEAHHIT,
  Role.INSAAT_FIRMASI,
];

@Injectable()
export class PoolAudienceService {
  constructor(private readonly prisma: PrismaService) {}

  private isSuperAdmin(user: CurrentUser) {
    return user?.role === Role.SUPER_ADMIN;
  }

  private normalizeName(value: unknown) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  private normalizeRoles(values: unknown): Role[] {
    if (!Array.isArray(values)) {
      return [];
    }

    return Array.from(
      new Set(
        values
          .map((value) => String(value || '').trim())
          .filter((value): value is Role =>
            AUDIENCE_ROLES.includes(value as Role),
          ),
      ),
    );
  }

  private normalizeIds(values: unknown): string[] {
    if (!Array.isArray(values)) {
      return [];
    }

    return Array.from(
      new Set(
        values
          .map((value) => String(value || '').trim())
          .filter(Boolean),
      ),
    );
  }

  private async requireOwnedGroup(id: string, user: CurrentUser) {
    const group = await this.prisma.poolAudienceGroup.findUnique({
      where: { id },
    });

    if (!group) {
      throw new NotFoundException('Hedef kitle grubu bulunamadı.');
    }

    if (!this.isSuperAdmin(user) && group.ownerId !== user.id) {
      throw new ForbiddenException(
        'Bu hedef kitle grubunu yönetme yetkiniz yok.',
      );
    }

    return group;
  }

  private async requireOwnedUnit(id: string, user: CurrentUser) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      select: {
        id: true,
        project: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    if (
      !this.isSuperAdmin(user) &&
      unit.project.ownerId !== user.id
    ) {
      throw new ForbiddenException(
        'Yalnız kendi portföyünüzün görünürlüğünü yönetebilirsiniz.',
      );
    }

    return unit;
  }

  private async getActiveUserIds(userIds: string[]) {
    if (!userIds.length) {
      return new Set<string>();
    }

    const now = new Date();

    const rows = await this.prisma.kullaniciUyelikPaketi.findMany({
      where: {
        kullaniciId: { in: userIds },
        durum: UyelikDurumu.AKTIF,
        baslangicTarihi: { lte: now },
        OR: [
          { bitisTarihi: null },
          { bitisTarihi: { gte: now } },
        ],
      },
      select: {
        kullaniciId: true,
      },
      distinct: ['kullaniciId'],
    });

    return new Set(rows.map((row) => row.kullaniciId));
  }

  private async serializeGroup(groupId: string) {
    const group = await this.prisma.poolAudienceGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                office: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Hedef kitle grubu bulunamadı.');
    }

    const activeIds = await this.getActiveUserIds(
      group.members.map((member) => member.userId),
    );

    return {
      id: group.id,
      name: group.name,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      _count: group._count,
      members: group.members.map((member) => ({
        id: member.user.id,
        fullName: `${member.user.firstName} ${member.user.lastName}`.trim(),
        role: member.user.role,
        officeName: member.user.office?.name || null,
        active: activeIds.has(member.user.id),
      })),
    };
  }

  getRoles() {
    return [
      { value: Role.EMLAKCI, label: 'Emlakçı' },
      { value: Role.MUTEAHHIT, label: 'Müteahhit' },
      { value: Role.INSAAT_FIRMASI, label: 'İnşaat Firması' },
    ];
  }

  async getGroups(user: CurrentUser) {
    return this.prisma.poolAudienceGroup.findMany({
      where: {
        ownerId: user.id,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async createGroup(
    user: CurrentUser,
    body: { name?: string },
  ) {
    const name = this.normalizeName(body?.name);

    if (!name) {
      throw new BadRequestException('Grup adı zorunludur.');
    }

    if (name.length > 80) {
      throw new BadRequestException(
        'Grup adı en fazla 80 karakter olabilir.',
      );
    }

    const existing = await this.prisma.poolAudienceGroup.findFirst({
      where: {
        ownerId: user.id,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Bu isimde bir hedef kitle grubunuz zaten var.',
      );
    }

    return this.prisma.poolAudienceGroup.create({
      data: {
        ownerId: user.id,
        name,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
    });
  }

  async getGroup(id: string, user: CurrentUser) {
    await this.requireOwnedGroup(id, user);
    return this.serializeGroup(id);
  }

  async updateGroup(
    id: string,
    user: CurrentUser,
    body: { name?: string },
  ) {
    const group = await this.requireOwnedGroup(id, user);
    const name = this.normalizeName(body?.name);

    if (!name) {
      throw new BadRequestException('Grup adı zorunludur.');
    }

    if (name.length > 80) {
      throw new BadRequestException(
        'Grup adı en fazla 80 karakter olabilir.',
      );
    }

    const duplicate = await this.prisma.poolAudienceGroup.findFirst({
      where: {
        ownerId: group.ownerId,
        id: { not: id },
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      throw new ConflictException(
        'Bu isimde başka bir hedef kitle grubunuz var.',
      );
    }

    await this.prisma.poolAudienceGroup.update({
      where: { id },
      data: { name },
    });

    return this.serializeGroup(id);
  }

  async deleteGroup(id: string, user: CurrentUser) {
    await this.requireOwnedGroup(id, user);

    await this.prisma.poolAudienceGroup.delete({
      where: { id },
    });

    return {
      ok: true,
      id,
    };
  }

  async addGroupMember(
    id: string,
    user: CurrentUser,
    body: { userId?: string },
  ) {
    await this.requireOwnedGroup(id, user);

    const userId = String(body?.userId || '').trim();

    if (!userId) {
      throw new BadRequestException('Kullanıcı seçilmelidir.');
    }

    if (userId === user.id) {
      throw new BadRequestException(
        'Kendinizi hedef kitle grubunuza eklemenize gerek yok.',
      );
    }

    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!target || !AUDIENCE_ROLES.includes(target.role)) {
      throw new BadRequestException(
        'Seçilen kullanıcı hedef kitleye eklenemez.',
      );
    }

    await this.prisma.poolAudienceGroupMember.upsert({
      where: {
        groupId_userId: {
          groupId: id,
          userId,
        },
      },
      create: {
        groupId: id,
        userId,
      },
      update: {},
    });

    return this.serializeGroup(id);
  }

  async removeGroupMember(
    id: string,
    userId: string,
    user: CurrentUser,
  ) {
    await this.requireOwnedGroup(id, user);

    await this.prisma.poolAudienceGroupMember.deleteMany({
      where: {
        groupId: id,
        userId,
      },
    });

    return this.serializeGroup(id);
  }

  async searchUsers(user: CurrentUser, query: string) {
    const q = String(query || '').trim();

    if (q.length < 2) {
      return [];
    }

    const rows = await this.prisma.user.findMany({
      where: {
        id: { not: user.id },
        role: { in: AUDIENCE_ROLES },
        OR: [
          {
            firstName: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            office: {
              name: {
                contains: q,
                mode: 'insensitive',
              },
            },
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        office: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
      take: 30,
    });

    const activeIds = await this.getActiveUserIds(
      rows.map((row) => row.id),
    );

    return rows.map((row) => ({
      id: row.id,
      fullName: `${row.firstName} ${row.lastName}`.trim(),
      role: row.role,
      officeName: row.office?.name || null,
      active: activeIds.has(row.id),
    }));
  }

  private async calculateActivePeople(
    ownerId: string,
    roles: Role[],
    groupIds: string[],
  ) {
    if (!roles.length && !groupIds.length) {
      return 0;
    }

    const groupMembers = groupIds.length
      ? await this.prisma.poolAudienceGroupMember.findMany({
          where: {
            groupId: { in: groupIds },
          },
          select: {
            userId: true,
          },
        })
      : [];

    const roleUsers = roles.length
      ? await this.prisma.user.findMany({
          where: {
            id: { not: ownerId },
            role: { in: roles },
          },
          select: {
            id: true,
          },
        })
      : [];

    const ids = Array.from(
      new Set([
        ...groupMembers.map((row) => row.userId),
        ...roleUsers.map((row) => row.id),
      ]),
    ).filter((id) => id !== ownerId);

    const activeIds = await this.getActiveUserIds(ids);

    return activeIds.size;
  }

  async getUnitAudience(id: string, user: CurrentUser) {
    const unit = await this.requireOwnedUnit(id, user);

    const audience = await this.prisma.poolAudienceUnit.findUnique({
      where: {
        unitId: id,
      },
      include: {
        groups: {
          select: {
            groupId: true,
          },
        },
      },
    });

    const mode = audience?.mode || PoolAudienceMode.PUBLIC;
    const roles = audience?.roles || [];
    const groupIds =
      audience?.groups.map((row) => row.groupId) || [];

    return {
      mode,
      roles,
      groupIds,
      activePeople:
        mode === PoolAudienceMode.TARGETED
          ? await this.calculateActivePeople(
              unit.project.ownerId,
              roles,
              groupIds,
            )
          : 0,
    };
  }

  async updateUnitAudience(
    id: string,
    user: CurrentUser,
    body: AudienceInput,
  ) {
    const unit = await this.requireOwnedUnit(id, user);

    const mode =
      body?.mode === 'TARGETED'
        ? PoolAudienceMode.TARGETED
        : body?.mode === 'PUBLIC'
          ? PoolAudienceMode.PUBLIC
          : null;

    if (!mode) {
      throw new BadRequestException(
        'Geçerli bir görünürlük modu seçilmelidir.',
      );
    }

    const roles =
      mode === PoolAudienceMode.TARGETED
        ? this.normalizeRoles(body.roles)
        : [];

    const groupIds =
      mode === PoolAudienceMode.TARGETED
        ? this.normalizeIds(body.groupIds)
        : [];

    if (
      mode === PoolAudienceMode.TARGETED &&
      !roles.length &&
      !groupIds.length
    ) {
      throw new BadRequestException(
        'Hedefli Havuz için en az bir rol veya grup seçmelisiniz.',
      );
    }

    if (groupIds.length) {
      const validGroups =
        await this.prisma.poolAudienceGroup.findMany({
          where: {
            id: { in: groupIds },
            ownerId: unit.project.ownerId,
          },
          select: {
            id: true,
          },
        });

      if (validGroups.length !== groupIds.length) {
        throw new BadRequestException(
          'Seçilen hedef kitle gruplarından biri geçersiz.',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.poolAudienceUnit.upsert({
        where: {
          unitId: id,
        },
        create: {
          unitId: id,
          mode,
          roles,
        },
        update: {
          mode,
          roles,
        },
      });

      await tx.poolAudienceUnitGroup.deleteMany({
        where: {
          unitId: id,
        },
      });

      if (groupIds.length) {
        await tx.poolAudienceUnitGroup.createMany({
          data: groupIds.map((groupId) => ({
            unitId: id,
            groupId,
          })),
          skipDuplicates: true,
        });
      }
    });

    return this.getUnitAudience(id, user);
  }

  async getProjectAudience(projectId: string, user: CurrentUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true, units: { where: { isSalesInventory: true }, orderBy: { createdAt: 'asc' }, select: { id: true }, take: 1 } },
    });
    if (!project) throw new NotFoundException('Proje bulunamadı.');
    if (project.ownerId !== user.id && !this.isSuperAdmin(user)) throw new ForbiddenException('Bu projenin görünürlüğünü yönetemezsiniz.');
    return project.units[0]
      ? this.getUnitAudience(project.units[0].id, user)
      : { mode: PoolAudienceMode.PUBLIC, roles: [], groupIds: [], activePeople: 0 };
  }

  async setProjectAudience(projectId: string, user: CurrentUser, body: AudienceInput, transaction?: Prisma.TransactionClient) {
    const save = async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`project-audience:${projectId}`}))`;
      const project = await tx.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true, units: { where: { isSalesInventory: true }, select: { id: true } } },
      });
      if (!project) throw new NotFoundException('Proje bulunamadı.');
      if (project.ownerId !== user.id && !this.isSuperAdmin(user)) throw new ForbiddenException('Bu projenin görünürlüğünü yönetemezsiniz.');
      if (!project.units.length) throw new BadRequestException('Önce proje satış stokunu oluşturun.');
      if (!body || !['PUBLIC', 'TARGETED'].includes(body.mode || '')) throw new BadRequestException('Geçerli bir görünürlük modu seçiniz.');
      const mode = body.mode === 'TARGETED' ? PoolAudienceMode.TARGETED : PoolAudienceMode.PUBLIC;
      const roles = mode === PoolAudienceMode.TARGETED ? this.normalizeRoles(body.roles) : [];
      const groupIds = mode === PoolAudienceMode.TARGETED ? this.normalizeIds(body.groupIds) : [];
      if (mode === PoolAudienceMode.TARGETED && !roles.length && !groupIds.length) throw new BadRequestException('En az bir rol veya hedef kitle grubu seçiniz.');
      if (groupIds.length) {
        const count = await tx.poolAudienceGroup.count({ where: { id: { in: groupIds }, ownerId: project.ownerId } });
        if (count !== groupIds.length) throw new BadRequestException('Seçilen hedef kitle grubu bu projeye ait değil.');
      }
      const ids = project.units.map(unit => unit.id);
      await tx.poolAudienceUnit.deleteMany({ where: { unitId: { in: ids } } });
      await tx.poolAudienceUnit.createMany({ data: ids.map(unitId => ({ unitId, mode, roles })) });
      if (groupIds.length) await tx.poolAudienceUnitGroup.createMany({ data: ids.flatMap(unitId => groupIds.map(groupId => ({ unitId, groupId }))) });
      return { mode, roles, groupIds };
    };
    return transaction ? save(transaction) : this.prisma.$transaction(save);
  }

  async filterPublicUnits<T extends { id: string }>(units: T[]): Promise<T[]> {
    if (!units.length) return [];
    const rows = await this.prisma.poolAudienceUnit.findMany({ where: { unitId: { in: units.map(unit => unit.id) }, mode: PoolAudienceMode.TARGETED }, select: { unitId: true } });
    const restricted = new Set(rows.map(row => row.unitId));
    return units.filter(unit => !restricted.has(unit.id));
  }

  async filterVisibleUnits<
    T extends {
      id: string;
      project: {
        ownerId: string;
      };
    },
  >(user: CurrentUser, units: T[]): Promise<T[]> {
    if (!units.length) return units;
    const blocked = new Set(await blockedPeerIds(this.prisma, user.id));
    units = units.filter(unit => !blocked.has(unit.project.ownerId));
    if (!units.length || this.isSuperAdmin(user)) return units;

    const rows = await this.prisma.poolAudienceUnit.findMany({
      where: {
        unitId: {
          in: units.map((unit) => unit.id),
        },
      },
      include: {
        groups: {
          include: {
            group: {
              include: {
                members: {
                  where: {
                    userId: user.id,
                  },
                  select: {
                    userId: true,
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const byUnitId = new Map(
      rows.map((row) => [row.unitId, row]),
    );

    return units.filter((unit) => {
      if (unit.project.ownerId === user.id) {
        return true;
      }

      const audience = byUnitId.get(unit.id);

      if (!audience || audience.mode === PoolAudienceMode.PUBLIC) {
        return true;
      }

      if (
        user.role &&
        audience.roles.includes(user.role as Role)
      ) {
        return true;
      }

      return audience.groups.some(
        (link) => link.group.members.length > 0,
      );
    });
  }

  async assertCanViewUnit(id: string, user: CurrentUser) {

    const unit = await this.prisma.unit.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        project: {
          select: {
            ownerId: true,
          },
        },
        poolAudience: {
          include: {
            groups: {
              include: {
                group: {
                  include: {
                    members: {
                      where: {
                        userId: user.id,
                      },
                      select: {
                        userId: true,
                      },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Portföy bulunamadı.');
    }

    await assertNoBlockedInteraction(this.prisma, user.id, [unit.project.ownerId]);
    if (unit.project.ownerId === user.id || this.isSuperAdmin(user)) return;

    const audience = unit.poolAudience;

    if (!audience || audience.mode === PoolAudienceMode.PUBLIC) {
      return;
    }

    const roleAllowed =
      Boolean(user.role) &&
      audience.roles.includes(user.role as Role);

    const groupAllowed = audience.groups.some(
      (link) => link.group.members.length > 0,
    );

    if (!roleAllowed && !groupAllowed) {
      throw new ForbiddenException(
        'Bu portföy hedef kitleniz için görünür değil.',
      );
    }
  }
}
