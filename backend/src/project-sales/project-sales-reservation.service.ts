import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UnitStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ReservationKind = 'RESERVATION' | 'OPTION';
type ReservationState =
  | 'ACTIVE'
  | 'RELEASED'
  | 'EXPIRED'
  | 'CONVERTED'
  | 'CANCELLED';

type CreateReservationBody = {
  type?: unknown;
  customerId?: unknown;
  expiresAt?: unknown;
  note?: unknown;
  idempotencyKey?: unknown;
};

type ExtendReservationBody = {
  expiresAt?: unknown;
  note?: unknown;
};

type ConvertReservationBody = {
  finalStatus?: unknown;
  note?: unknown;
};

type ReleaseReservationBody = {
  note?: unknown;
};

type LockedUnitRow = {
  id: string;
  projectId: string;
  ownerId: string;
  status: string;
};

type ReservationRow = {
  id: string;
  projectId: string;
  unitId: string;
  customerId: string | null;
  createdById: string;
  type: ReservationKind;
  status: ReservationState;
  previousUnitStatus: string;
  activeUnitStatus: string;
  startsAt: Date;
  expiresAt: Date;
  releasedAt: Date | null;
  convertedAt: Date | null;
  cancelledAt: Date | null;
  expiredAt: Date | null;
  note: string | null;
  releaseNote: string | null;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
};

type ReservationListRow = ReservationRow & {
  inventoryCode: string | null;
  unitType: string;
  unitStatus: string;
  blockCode: string | null;
  floorLabel: string | null;
  unitNumber: string | null;
  roomCount: string | null;
  unitPrice: number;
  priceCurrency: string;
};

const MAX_RESERVATION_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const ACTIVE_UNIT_STATUS: Record<ReservationKind, UnitStatus> = {
  RESERVATION: UnitStatus.REZERVE,
  OPTION: UnitStatus.OPSIYONLU,
};

const BLOCKED_SOURCE_STATUSES = new Set<UnitStatus>([
  UnitStatus.SATILDI,
  UnitStatus.PASIF,
  UnitStatus.REZERVE,
  UnitStatus.OPSIYONLU,
  UnitStatus.KIRALANDII,
]);

const FINAL_STATUSES = new Set<UnitStatus>([
  UnitStatus.SATILDI,
  UnitStatus.KIRALANDII,
]);

@Injectable()
export class ProjectSalesReservationService {
  constructor(private readonly prisma: PrismaService) {}

  async createReservation(
    unitId: string,
    userId: string,
    userRole: Role,
    body: CreateReservationBody,
  ) {
    const type = this.requiredReservationKind(body.type);
    const expiresAt = this.requiredFutureDate(body.expiresAt, 'Bitiş tarihi');
    const idempotencyKey = this.requiredIdempotencyKey(body.idempotencyKey);
    const note = this.optionalText(body.note, 500);
    const customerId = this.optionalId(body.customerId);

    this.validateReservationWindow(expiresAt);

    return this.prisma.$transaction(async (tx) => {
      const unit = await this.lockUnit(tx, unitId);
      this.ensureProjectAccess(unit.ownerId, userId, userRole);

      await this.expireDueForUnit(tx, unit.id, userId);

      const existingByKey = await tx.$queryRaw<ReservationRow[]>`
        SELECT *
        FROM "ProjectSalesReservation"
        WHERE "projectId" = ${unit.projectId}
          AND "idempotencyKey" = ${idempotencyKey}
        LIMIT 1
      `;

      if (existingByKey[0]) {
        return this.toPublicReservation(existingByKey[0]);
      }

      const active = await tx.$queryRaw<ReservationRow[]>`
        SELECT *
        FROM "ProjectSalesReservation"
        WHERE "unitId" = ${unit.id}
          AND "status" = 'ACTIVE'
        LIMIT 1
        FOR UPDATE
      `;

      if (active[0]) {
        throw new ConflictException(
          'Bu bağımsız bölüm için aktif rezervasyon veya opsiyon bulunuyor.',
        );
      }

      const currentStatus = unit.status as UnitStatus;
      if (BLOCKED_SOURCE_STATUSES.has(currentStatus)) {
        throw new ConflictException(
          'Bu bağımsız bölüm mevcut stok durumunda rezervasyona uygun değil.',
        );
      }

      if (customerId) {
        await this.ensureCustomerAccess(tx, customerId, unit.ownerId, userId, userRole);
      }

      const activeUnitStatus = ACTIVE_UNIT_STATUS[type];
      const inserted = await tx.$queryRaw<ReservationRow[]>`
        INSERT INTO "ProjectSalesReservation" (
          "projectId",
          "unitId",
          "customerId",
          "createdById",
          "type",
          "status",
          "previousUnitStatus",
          "activeUnitStatus",
          "expiresAt",
          "note",
          "idempotencyKey",
          "updatedAt"
        ) VALUES (
          ${unit.projectId},
          ${unit.id},
          ${customerId},
          ${userId},
          ${type},
          'ACTIVE',
          ${currentStatus},
          ${activeUnitStatus},
          ${expiresAt},
          ${note},
          ${idempotencyKey},
          CURRENT_TIMESTAMP
        )
        RETURNING *
      `;

      const reservation = inserted[0];
      if (!reservation) {
        throw new ConflictException('Rezervasyon oluşturulamadı.');
      }

      await tx.unit.update({
        where: { id: unit.id },
        data: { status: activeUnitStatus },
      });

      await this.writeEvent(tx, {
        reservationId: reservation.id,
        actorId: userId,
        eventType: 'CREATED',
        fromStatus: currentStatus,
        toStatus: activeUnitStatus,
        note,
        metadata: {
          type,
          expiresAt: expiresAt.toISOString(),
          customerLinked: Boolean(customerId),
        },
      });

      return this.toPublicReservation(reservation);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async listProjectReservations(
    projectId: string,
    userId: string,
    userRole: Role,
    requestedStatus?: unknown,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true, name: true, code: true },
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı.');
    }

    this.ensureProjectAccess(project.ownerId, userId, userRole);
    await this.expireDueForProject(projectId, userId);

    const status = this.normalizeListStatus(requestedStatus);
    const rows = status === 'ALL'
      ? await this.prisma.$queryRaw<ReservationListRow[]>`
          SELECT
            r.*,
            u."inventoryCode",
            u."type"::text AS "unitType",
            u."status"::text AS "unitStatus",
            b."code" AS "blockCode",
            COALESCE(f."label", u."floorLabel") AS "floorLabel",
            u."number" AS "unitNumber",
            u."roomCount",
            u."price" AS "unitPrice",
            COALESCE(u."priceCurrency", 'TRY') AS "priceCurrency"
          FROM "ProjectSalesReservation" r
          JOIN "Unit" u ON u."id" = r."unitId"
          LEFT JOIN "ProjectBlock" b ON b."id" = u."blockId"
          LEFT JOIN "ProjectFloor" f ON f."id" = u."floorId"
          WHERE r."projectId" = ${projectId}
          ORDER BY r."createdAt" DESC
          LIMIT 500
        `
      : await this.prisma.$queryRaw<ReservationListRow[]>`
          SELECT
            r.*,
            u."inventoryCode",
            u."type"::text AS "unitType",
            u."status"::text AS "unitStatus",
            b."code" AS "blockCode",
            COALESCE(f."label", u."floorLabel") AS "floorLabel",
            u."number" AS "unitNumber",
            u."roomCount",
            u."price" AS "unitPrice",
            COALESCE(u."priceCurrency", 'TRY') AS "priceCurrency"
          FROM "ProjectSalesReservation" r
          JOIN "Unit" u ON u."id" = r."unitId"
          LEFT JOIN "ProjectBlock" b ON b."id" = u."blockId"
          LEFT JOIN "ProjectFloor" f ON f."id" = u."floorId"
          WHERE r."projectId" = ${projectId}
            AND r."status" = ${status}
          ORDER BY r."createdAt" DESC
          LIMIT 500
        `;

    return {
      project,
      status,
      generatedAt: new Date().toISOString(),
      reservations: rows.map((row) => this.toPublicListRow(row)),
      summary: {
        total: rows.length,
        active: rows.filter((row) => row.status === 'ACTIVE').length,
        reservations: rows.filter((row) => row.type === 'RESERVATION').length,
        options: rows.filter((row) => row.type === 'OPTION').length,
      },
      policy: {
        version: 'PROJECT_SALES_RESERVATION_V1',
        doubleReservationProtection: true,
        expirationRestoresPreviousStatusWhenSafe: true,
        privateCrmContactFieldsIncluded: false,
      },
    };
  }

  async extendReservation(
    reservationId: string,
    userId: string,
    userRole: Role,
    body: ExtendReservationBody,
  ) {
    const expiresAt = this.requiredFutureDate(body.expiresAt, 'Yeni bitiş tarihi');
    const note = this.optionalText(body.note, 500);
    this.validateReservationWindow(expiresAt);

    return this.prisma.$transaction(async (tx) => {
      const reservation = await this.lockReservation(tx, reservationId);
      const unit = await this.lockUnit(tx, reservation.unitId);
      this.ensureProjectAccess(unit.ownerId, userId, userRole);

      if (reservation.status !== 'ACTIVE') {
        throw new ConflictException('Yalnızca aktif rezervasyon veya opsiyon uzatılabilir.');
      }

      if (reservation.expiresAt.getTime() <= Date.now()) {
        await this.expireReservation(tx, reservation, userId);
        throw new ConflictException('Rezervasyon süresi dolmuş. Yeni rezervasyon oluşturun.');
      }

      const updated = await tx.$queryRaw<ReservationRow[]>`
        UPDATE "ProjectSalesReservation"
        SET "expiresAt" = ${expiresAt},
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${reservation.id}
        RETURNING *
      `;

      await this.writeEvent(tx, {
        reservationId: reservation.id,
        actorId: userId,
        eventType: 'EXTENDED',
        fromStatus: reservation.status,
        toStatus: reservation.status,
        note,
        metadata: {
          oldExpiresAt: reservation.expiresAt.toISOString(),
          newExpiresAt: expiresAt.toISOString(),
        },
      });

      return this.toPublicReservation(updated[0]);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async releaseReservation(
    reservationId: string,
    userId: string,
    userRole: Role,
    body: ReleaseReservationBody,
  ) {
    const note = this.optionalText(body.note, 500);

    return this.prisma.$transaction(async (tx) => {
      const reservation = await this.lockReservation(tx, reservationId);
      const unit = await this.lockUnit(tx, reservation.unitId);
      this.ensureProjectAccess(unit.ownerId, userId, userRole);

      if (reservation.status !== 'ACTIVE') {
        throw new ConflictException('Bu kayıt artık aktif değil.');
      }

      if (reservation.expiresAt.getTime() <= Date.now()) {
        await this.expireReservation(tx, reservation, userId);
        return {
          ...this.toPublicReservation(reservation),
          status: 'EXPIRED' as const,
        };
      }

      await this.restoreUnitStatusIfSafe(tx, reservation);
      const updated = await tx.$queryRaw<ReservationRow[]>`
        UPDATE "ProjectSalesReservation"
        SET "status" = 'RELEASED',
            "releasedAt" = CURRENT_TIMESTAMP,
            "releaseNote" = ${note},
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${reservation.id}
        RETURNING *
      `;

      await this.writeEvent(tx, {
        reservationId: reservation.id,
        actorId: userId,
        eventType: 'RELEASED',
        fromStatus: reservation.activeUnitStatus,
        toStatus: reservation.previousUnitStatus,
        note,
      });

      return this.toPublicReservation(updated[0]);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async convertReservation(
    reservationId: string,
    userId: string,
    userRole: Role,
    body: ConvertReservationBody,
  ) {
    const finalStatus = this.requiredFinalStatus(body.finalStatus);
    const note = this.optionalText(body.note, 500);

    return this.prisma.$transaction(async (tx) => {
      const reservation = await this.lockReservation(tx, reservationId);
      const unit = await this.lockUnit(tx, reservation.unitId);
      this.ensureProjectAccess(unit.ownerId, userId, userRole);

      if (reservation.status !== 'ACTIVE') {
        throw new ConflictException('Yalnızca aktif rezervasyon veya opsiyon satışa dönüştürülebilir.');
      }

      if (reservation.expiresAt.getTime() <= Date.now()) {
        await this.expireReservation(tx, reservation, userId);
        throw new ConflictException('Rezervasyon süresi dolmuş.');
      }

      await tx.unit.update({
        where: { id: unit.id },
        data: { status: finalStatus },
      });

      const updated = await tx.$queryRaw<ReservationRow[]>`
        UPDATE "ProjectSalesReservation"
        SET "status" = 'CONVERTED',
            "convertedAt" = CURRENT_TIMESTAMP,
            "releaseNote" = ${note},
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${reservation.id}
        RETURNING *
      `;

      await this.writeEvent(tx, {
        reservationId: reservation.id,
        actorId: userId,
        eventType: 'CONVERTED',
        fromStatus: reservation.activeUnitStatus,
        toStatus: finalStatus,
        note,
      });

      return this.toPublicReservation(updated[0]);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async expireDueForProject(projectId: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<ReservationRow[]>`
        SELECT *
        FROM "ProjectSalesReservation"
        WHERE "projectId" = ${projectId}
          AND "status" = 'ACTIVE'
          AND "expiresAt" <= CURRENT_TIMESTAMP
        ORDER BY "expiresAt" ASC
        FOR UPDATE SKIP LOCKED
      `;

      for (const row of rows) {
        await this.expireReservation(tx, row, actorId);
      }

      return rows.length;
    });
  }

  private async expireDueForUnit(
    tx: Prisma.TransactionClient,
    unitId: string,
    actorId: string,
  ) {
    const rows = await tx.$queryRaw<ReservationRow[]>`
      SELECT *
      FROM "ProjectSalesReservation"
      WHERE "unitId" = ${unitId}
        AND "status" = 'ACTIVE'
        AND "expiresAt" <= CURRENT_TIMESTAMP
      FOR UPDATE
    `;

    for (const row of rows) {
      await this.expireReservation(tx, row, actorId);
    }
  }

  private async expireReservation(
    tx: Prisma.TransactionClient,
    reservation: ReservationRow,
    actorId: string | null,
  ) {
    await this.restoreUnitStatusIfSafe(tx, reservation);

    await tx.$executeRaw`
      UPDATE "ProjectSalesReservation"
      SET "status" = 'EXPIRED',
          "expiredAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${reservation.id}
        AND "status" = 'ACTIVE'
    `;

    await this.writeEvent(tx, {
      reservationId: reservation.id,
      actorId,
      eventType: 'EXPIRED',
      fromStatus: reservation.activeUnitStatus,
      toStatus: reservation.previousUnitStatus,
      note: 'Süre dolumu nedeniyle otomatik kapatıldı.',
    });
  }

  private async restoreUnitStatusIfSafe(
    tx: Prisma.TransactionClient,
    reservation: ReservationRow,
  ) {
    const activeStatus = this.toUnitStatus(reservation.activeUnitStatus);
    const previousStatus = this.toUnitStatus(reservation.previousUnitStatus);

    await tx.unit.updateMany({
      where: {
        id: reservation.unitId,
        status: activeStatus,
      },
      data: {
        status: previousStatus,
      },
    });
  }

  private async lockUnit(tx: Prisma.TransactionClient, unitId: string) {
    const rows = await tx.$queryRaw<LockedUnitRow[]>`
      SELECT
        u."id",
        u."projectId",
        u."status"::text AS "status",
        p."ownerId"
      FROM "Unit" u
      JOIN "Project" p ON p."id" = u."projectId"
      WHERE u."id" = ${unitId}
      LIMIT 1
      FOR UPDATE OF u
    `;

    const unit = rows[0];
    if (!unit) {
      throw new NotFoundException('Bağımsız bölüm bulunamadı.');
    }

    return unit;
  }

  private async lockReservation(
    tx: Prisma.TransactionClient,
    reservationId: string,
  ) {
    const rows = await tx.$queryRaw<ReservationRow[]>`
      SELECT *
      FROM "ProjectSalesReservation"
      WHERE "id" = ${reservationId}
      LIMIT 1
      FOR UPDATE
    `;

    const reservation = rows[0];
    if (!reservation) {
      throw new NotFoundException('Rezervasyon veya opsiyon bulunamadı.');
    }

    return reservation;
  }

  private async ensureCustomerAccess(
    tx: Prisma.TransactionClient,
    customerId: string,
    projectOwnerId: string,
    actingUserId: string,
    userRole: Role,
  ) {
    if (userRole === Role.SUPER_ADMIN && actingUserId !== projectOwnerId) {
      throw new ForbiddenException(
        'SUPER_ADMIN özel CRM müşteri kaydını rezervasyona bağlayamaz.',
      );
    }

    const customer = await tx.customer.findUnique({
      where: { id: customerId },
      select: { id: true, ownerId: true },
    });

    if (!customer || customer.ownerId !== projectOwnerId) {
      throw new ForbiddenException('Bu CRM müşteri kaydı bu projeye bağlanamaz.');
    }
  }

  private ensureProjectAccess(ownerId: string, userId: string, role: Role) {
    if (ownerId === userId || role === Role.SUPER_ADMIN) {
      return;
    }

    throw new ForbiddenException('Bu projenin satış operasyonlarına erişim yetkiniz yok.');
  }

  private requiredReservationKind(value: unknown): ReservationKind {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'RESERVATION' || normalized === 'OPTION') {
      return normalized;
    }

    throw new BadRequestException('Tip RESERVATION veya OPTION olmalıdır.');
  }

  private requiredFinalStatus(value: unknown): UnitStatus {
    const normalized = String(value || '').trim().toUpperCase() as UnitStatus;
    if (FINAL_STATUSES.has(normalized)) {
      return normalized;
    }

    throw new BadRequestException('Son durum SATILDI veya KIRALANDII olmalıdır.');
  }

  private requiredFutureDate(value: unknown, label: string) {
    const text = String(value || '').trim();
    if (!text) {
      throw new BadRequestException(`${label} zorunludur.`);
    }

    const date = new Date(text);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      throw new BadRequestException(`${label} gelecekte geçerli bir tarih olmalıdır.`);
    }

    return date;
  }

  private validateReservationWindow(expiresAt: Date) {
    if (expiresAt.getTime() - Date.now() > MAX_RESERVATION_WINDOW_MS) {
      throw new BadRequestException('Rezervasyon veya opsiyon süresi en fazla 90 gün olabilir.');
    }
  }

  private requiredIdempotencyKey(value: unknown) {
    const text = String(value || '').trim();
    if (text.length < 8 || text.length > 120) {
      throw new BadRequestException('idempotencyKey 8 ile 120 karakter arasında olmalıdır.');
    }
    return text;
  }

  private optionalId(value: unknown) {
    const text = String(value || '').trim();
    return text || null;
  }

  private optionalText(value: unknown, maxLength: number) {
    if (value === undefined || value === null || value === '') return null;
    const text = String(value).trim();
    if (text.length > maxLength) {
      throw new BadRequestException(`Metin en fazla ${maxLength} karakter olabilir.`);
    }
    return text || null;
  }

  private normalizeListStatus(value: unknown): ReservationState | 'ALL' {
    const normalized = String(value || 'ACTIVE').trim().toUpperCase();
    if (normalized === 'ALL') return 'ALL';

    const allowed = new Set<ReservationState>([
      'ACTIVE',
      'RELEASED',
      'EXPIRED',
      'CONVERTED',
      'CANCELLED',
    ]);

    if (!allowed.has(normalized as ReservationState)) {
      throw new BadRequestException('Geçersiz rezervasyon durum filtresi.');
    }

    return normalized as ReservationState;
  }

  private toUnitStatus(value: string) {
    if (!Object.values(UnitStatus).includes(value as UnitStatus)) {
      throw new ConflictException(`Bilinmeyen stok durumu: ${value}`);
    }
    return value as UnitStatus;
  }

  private async writeEvent(
    tx: Prisma.TransactionClient,
    event: {
      reservationId: string;
      actorId: string | null;
      eventType: string;
      fromStatus?: string | null;
      toStatus?: string | null;
      note?: string | null;
      metadata?: Record<string, unknown>;
    },
  ) {
    const metadata = event.metadata
      ? JSON.stringify(event.metadata)
      : null;

    await tx.$executeRaw`
      INSERT INTO "ProjectSalesReservationEvent" (
        "reservationId",
        "actorId",
        "eventType",
        "fromStatus",
        "toStatus",
        "note",
        "metadata"
      ) VALUES (
        ${event.reservationId},
        ${event.actorId},
        ${event.eventType},
        ${event.fromStatus || null},
        ${event.toStatus || null},
        ${event.note || null},
        CAST(${metadata} AS JSONB)
      )
    `;
  }

  private toPublicReservation(row?: ReservationRow) {
    if (!row) {
      throw new ConflictException('Rezervasyon kaydı alınamadı.');
    }

    return {
      id: row.id,
      projectId: row.projectId,
      unitId: row.unitId,
      customerId: row.customerId,
      type: row.type,
      status: row.status,
      previousUnitStatus: row.previousUnitStatus,
      activeUnitStatus: row.activeUnitStatus,
      startsAt: row.startsAt,
      expiresAt: row.expiresAt,
      releasedAt: row.releasedAt,
      convertedAt: row.convertedAt,
      expiredAt: row.expiredAt,
      note: row.note,
      releaseNote: row.releaseNote,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toPublicListRow(row: ReservationListRow) {
    return {
      ...this.toPublicReservation(row),
      unit: {
        inventoryCode: row.inventoryCode,
        type: row.unitType,
        status: row.unitStatus,
        blockCode: row.blockCode,
        floorLabel: row.floorLabel,
        number: row.unitNumber,
        roomCount: row.roomCount,
        price: Number(row.unitPrice || 0),
        priceCurrency: row.priceCurrency || 'TRY',
      },
    };
  }
}
