import { ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';

export type CoordinationDirection =
  | 'CRM_TO_REQUEST'
  | 'REQUEST_TO_CRM';

export type CoordinationStatus =
  | 'PENDING'
  | 'COMPLETE'
  | 'FAILED';

export type CoordinationLinkRow = {
  id: string;
  ownerId: string;
  direction: CoordinationDirection;
  sourceEntityType: string;
  sourceEntityId: string;
  targetEntityType: string | null;
  targetEntityId: string | null;
  networkPostId: string | null;
  customerId: string | null;
  customerInterestId: string | null;
  unitId: string | null;
  status: CoordinationStatus;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

const LINK_STALE_MS = 5 * 60 * 1000;

@Injectable()
export class CoordinationLinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async reserve(input: {
    ownerId: string;
    direction: CoordinationDirection;
    sourceEntityType: string;
    sourceEntityId: string;
  }): Promise<{ link: CoordinationLinkRow; acquired: boolean }> {
    const inserted = await this.prisma.$queryRaw<CoordinationLinkRow[]>`
      INSERT INTO "EphCoordinationLink" (
        "id",
        "ownerId",
        "direction",
        "sourceEntityType",
        "sourceEntityId",
        "status",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${input.ownerId},
        ${input.direction},
        ${input.sourceEntityType},
        ${input.sourceEntityId},
        'PENDING',
        NOW(),
        NOW()
      )
      ON CONFLICT (
        "ownerId",
        "direction",
        "sourceEntityType",
        "sourceEntityId"
      ) DO NOTHING
      RETURNING *
    `;

    if (inserted[0]) {
      return { link: inserted[0], acquired: true };
    }

    const existing = await this.find(
      input.ownerId,
      input.direction,
      input.sourceEntityType,
      input.sourceEntityId,
    );

    if (!existing) {
      throw new ConflictException(
        'Koordinasyon bağlantısı oluşturulamadı.',
      );
    }

    if (existing.status === 'COMPLETE') {
      return { link: existing, acquired: false };
    }

    const pendingIsFresh =
      existing.status === 'PENDING' &&
      Date.now() - new Date(existing.updatedAt).getTime() < LINK_STALE_MS;

    if (pendingIsFresh) {
      throw new ConflictException(
        'Bu koordinasyon işlemi halen devam ediyor.',
      );
    }

    return {
      link: await this.restart(existing.id),
      acquired: true,
    };
  }

  async complete(
    linkId: string,
    input: {
      targetEntityType: string;
      targetEntityId: string;
      networkPostId?: string | null;
      customerId?: string | null;
      customerInterestId?: string | null;
      unitId?: string | null;
      metadata: Record<string, unknown>;
    },
  ) {
    const metadata = JSON.stringify(input.metadata);
    const rows = await this.prisma.$queryRaw<CoordinationLinkRow[]>`
      UPDATE "EphCoordinationLink"
      SET
        "targetEntityType" = ${input.targetEntityType},
        "targetEntityId" = ${input.targetEntityId},
        "networkPostId" = ${input.networkPostId || null},
        "customerId" = ${input.customerId || null},
        "customerInterestId" = ${input.customerInterestId || null},
        "unitId" = ${input.unitId || null},
        "status" = 'COMPLETE',
        "metadata" = ${metadata}::jsonb,
        "updatedAt" = NOW()
      WHERE "id" = ${linkId}
      RETURNING *
    `;

    if (!rows[0]) {
      throw new ConflictException(
        'Koordinasyon bağlantısı tamamlanamadı.',
      );
    }

    return rows[0];
  }

  async fail(linkId: string, error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Bilinmeyen koordinasyon hatası';
    const metadata = JSON.stringify({
      error: message.slice(0, 500),
    });

    await this.prisma.$executeRaw`
      UPDATE "EphCoordinationLink"
      SET
        "status" = 'FAILED',
        "metadata" = ${metadata}::jsonb,
        "updatedAt" = NOW()
      WHERE "id" = ${linkId}
    `;
  }

  async find(
    ownerId: string,
    direction: CoordinationDirection,
    sourceEntityType: string,
    sourceEntityId: string,
  ) {
    const rows = await this.prisma.$queryRaw<CoordinationLinkRow[]>`
      SELECT *
      FROM "EphCoordinationLink"
      WHERE
        "ownerId" = ${ownerId}
        AND "direction" = ${direction}
        AND "sourceEntityType" = ${sourceEntityType}
        AND "sourceEntityId" = ${sourceEntityId}
      LIMIT 1
    `;

    return rows[0] || null;
  }

  private async restart(linkId: string) {
    const rows = await this.prisma.$queryRaw<CoordinationLinkRow[]>`
      UPDATE "EphCoordinationLink"
      SET
        "status" = 'PENDING',
        "targetEntityType" = NULL,
        "targetEntityId" = NULL,
        "networkPostId" = NULL,
        "customerId" = NULL,
        "customerInterestId" = NULL,
        "unitId" = NULL,
        "metadata" = NULL,
        "updatedAt" = NOW()
      WHERE "id" = ${linkId}
      RETURNING *
    `;

    if (!rows[0]) {
      throw new ConflictException(
        'Koordinasyon bağlantısı yeniden başlatılamadı.',
      );
    }

    return rows[0];
  }
}
