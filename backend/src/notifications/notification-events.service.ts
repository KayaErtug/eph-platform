import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseCostValue } from '../pricing/commercial-costs';
import {
  NotificationInput,
  NotificationsService,
} from './notifications.service';

type Event = NotificationInput & { userId: string };

/** Reads committed domain records. No cursor can skip a late transaction commit;
 * the unique eventKey is the checkpoint, shared by all PM2 workers. */
@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);
  private running = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async publish(source: Prisma.Sql) {
    const events = await this.prisma.$queryRaw<Event[]>(Prisma.sql`
      SELECT e.* FROM (${source}) e
      WHERE NOT EXISTS (SELECT 1 FROM "NetworkNotification" n WHERE n."eventKey" = e."eventKey")
      ORDER BY e."eventKey" LIMIT 100`);
    for (const event of events) {
      const { userId, ...input } = event;
      await this.notifications.notify(userId, input);
    }
    return events.length;
  }

  private async since() {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: 'EPH38_NOTIFICATIONS_SINCE' },
    });
    const date =
      typeof row?.valueJson === 'string' ? new Date(row.valueJson) : null;
    if (!date || !Number.isFinite(date.getTime()))
      throw new Error('EPH38 migration watermark is missing or invalid.');
    return date;
  }

  async collect() {
    if (this.running) return;
    this.running = true;
    try {
      const since = await this.since();
      const sources = this.sources(since);
      for (let index = 0; index < sources.length; index++) {
        try {
          await this.publish(sources[index]);
        } catch {
          this.logger.error({
            event: 'EPH_NOTIFICATION_EVENT',
            source: index,
            code: 'COLLECTION_FAILED',
          });
        }
      }
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'LIMIT_PK_DUSUK_UYARI' },
      });
      const threshold = parseCostValue(setting?.valueJson);
      if (threshold === null)
        this.logger.warn({
          event: 'EPH_NOTIFICATION_EVENT',
          code: 'LIMIT_PK_DUSUK_UYARI_MISSING',
        });
      else
        await this.publish(Prisma.sql`
        SELECT h."kullaniciId" AS "userId", 'LOW_PK' AS type, 'ONEMLI' AS priority,
          'PK bakiyeniz azaldı' AS title, 'PK bakiyeniz tanımlı uyarı eşiğinin altına düştü.' AS body,
          '/kontor' AS "actionUrl", 'low-pk:' || h.id AS "eventKey"
        FROM "KontorHareketi" h JOIN "User" u ON u.id = h."kullaniciId"
        WHERE h."olusturulmaTarihi" >= ${since} AND h."oncekiBakiye" >= ${threshold} AND h."sonrakiBakiye" < ${threshold}`);
    } catch {
      this.logger.error({
        event: 'EPH_NOTIFICATION_EVENT',
        code: 'COLLECTION_FAILED_OR_MIGRATION_MISSING',
      });
    } finally {
      this.running = false;
    }
  }

  sources(since: Date): Prisma.Sql[] {
    return [
      Prisma.sql`
        SELECT cp."userId", 'NEW_MESSAGE' AS type, 'ONEMLI' AS priority, 'Yeni mesajınız var' AS title,
          CASE WHEN sender.role = 'SUPER_ADMIN' THEN 'Yazılım Ekibi size mesaj gönderdi.' ELSE 'Size yeni bir mesaj gönderildi.' END AS body,
          '/messages/' || m."conversationId" AS "actionUrl", 'message:' || m.id || ':' || cp."userId" AS "eventKey"
        FROM "Message" m JOIN "ConversationParticipant" cp ON cp."conversationId" = m."conversationId"
        JOIN "User" sender ON sender.id = m."senderId"
        WHERE m."createdAt" >= ${since} AND cp."createdAt" <= m."createdAt" AND cp."userId" <> m."senderId"`,
      Prisma.sql`
        SELECT o."ownerUserId" AS "userId", 'OFFICE_JOIN_REQUEST' AS type, 'ACIL' AS priority,
          'Yeni ofis başvurusu' AS title, 'Ofisinize katılım başvurusu geldi.' AS body, '/office' AS "actionUrl",
          'office-request:' || s.key || ':' || (s."valueJson"->>'requestedAt') AS "eventKey"
        FROM "SystemSetting" s JOIN "Office" o ON o.id = s."valueJson"->>'officeId'
        WHERE s.key LIKE 'EPH_OFFICE_JOIN_%' AND o."ownerUserId" IS NOT NULL AND o."isActive" = true
          AND s."valueJson"->>'requestedAt' >= ${since.toISOString()}`,
      Prisma.sql`
        SELECT s."valueJson"->>'userId' AS "userId", 'OFFICE_JOIN_DECIDED' AS type, 'ONEMLI' AS priority,
          'Ofis başvurunuz sonuçlandı' AS title,
          CASE WHEN s."valueJson"->>'status' = 'APPROVED' THEN 'Ofis başvurunuz onaylandı.' ELSE 'Ofis başvurunuz reddedildi.' END AS body,
          '/office' AS "actionUrl", 'office-decision:' || s.key || ':' || (s."valueJson"->>'decidedAt') AS "eventKey"
        FROM "SystemSetting" s JOIN "User" u ON u.id = s."valueJson"->>'userId'
        WHERE s.key LIKE 'EPH_OFFICE_JOIN_%' AND s."valueJson"->>'status' IN ('APPROVED', 'REJECTED')
          AND s."valueJson"->>'decidedAt' >= ${since.toISOString()}`,
      Prisma.sql`
        SELECT p."ownerId" AS "userId", 'CONTACT_UNLOCKED' AS type, 'BILGI' AS priority,
          'İlanınız için iletişim açıldı' AS title, 'Bir kullanıcı İletişime Geç ile ilanınıza erişti.' AS body,
          '/portfoy/' || un.id AS "actionUrl", 'contact:' || h.id AS "eventKey"
        FROM "KontorHareketi" h JOIN "Unit" un ON un.id = h."ilgiliKayitId" JOIN "Project" p ON p.id = un."projectId"
        WHERE h."olusturulmaTarihi" >= ${since} AND h."hareketTuru" = 'HARCAMA' AND h."islemTuru" = 'HAVUZ_OZEL_BILGI'
          AND h."ilgiliKayitTuru" = 'UNIT' AND p."ownerId" <> COALESCE(h."olusturanId", h."kullaniciId")`,
      Prisma.sql`
        SELECT s."userId", 'REQUEST_MATCH' AS type, 'ONEMLI' AS priority,
          'Yeni talep eşleşmeleri' AS title, 'Onayladığınız taramada talebinize uygun eşleşmeler bulundu.' AS body,
          '/network/' || s."sourceId" AS "actionUrl", 'request-match:' || s.id AS "eventKey"
        FROM "MatchScanAttempt" s JOIN "User" u ON u.id = s."userId"
        WHERE s.status = 'COMPLETED' AND s."sourceType" = 'REQUEST' AND s."completedAt" >= ${since}
          AND jsonb_typeof(s."resultJson"->'matches') = 'array' AND s."resultJson"->'matches' <> '[]'::jsonb`,
      Prisma.sql`
        SELECT a."targetUserId" AS "userId", 'ROLE_CHANGED' AS type, 'ONEMLI' AS priority,
          'Rol veya yetkileriniz değişti' AS title, 'Hesap rolünüz veya yetkileriniz güncellendi.' AS body,
          '/profile' AS "actionUrl", 'admin-role:' || a.id AS "eventKey"
        FROM "AdminActionLog" a JOIN "User" u ON u.id = a."targetUserId"
        WHERE a."createdAt" >= ${since} AND a.action IN ('USER_ROLE_CHANGED', 'USER_CAPABILITIES_UPDATED')`,
      Prisma.sql`
        SELECT a."targetUserId" AS "userId", 'ROLE_CHANGED' AS type, 'ONEMLI' AS priority,
          'Yetkileriniz değişti' AS title, 'Hesap yetkileriniz güncellendi.' AS body,
          '/profile' AS "actionUrl", 'permission:' || a.id AS "eventKey"
        FROM "AuditLog" a JOIN "User" u ON u.id = a."targetUserId"
        WHERE a."createdAt" >= ${since} AND a.action IN ('UPDATE_USER_PERMISSION', 'UPDATE_USER_ROLE')`,
      Prisma.sql`
        SELECT u.id AS "userId", 'ADMIN_ANNOUNCEMENT' AS type, 'BILGI' AS priority,
          a.title, a.content AS body, '/dashboard' AS "actionUrl", 'announcement:' || a.id || ':' || u.id AS "eventKey"
        FROM "PlatformAnnouncement" a JOIN "User" u ON u."isApproved" = true AND u."adminVisible" = true
        WHERE a."isActive" = true AND btrim(a.title) <> '' AND btrim(a.content) <> '' AND a."startsAt" <= CURRENT_TIMESTAMP AND (a."endsAt" IS NULL OR a."endsAt" > CURRENT_TIMESTAMP)
          AND (a."createdAt" >= ${since} OR a."startsAt" >= ${since}) AND (a.audience = 'TUM_UYELER'
            OR a.audience = 'EMLAKCILAR' AND u.role = 'EMLAKCI' OR a.audience = 'MUTEAHHITLER' AND u.role = 'MUTEAHHIT'
            OR a.audience = 'INSAAT_FIRMALARI' AND u.role = 'INSAAT_FIRMASI'
            OR a.audience = 'ADMINLER' AND u.role IN ('ADMIN', 'SUPER_ADMIN'))`,
      Prisma.sql`
        SELECT u.id AS "userId", 'ADMIN_ANNOUNCEMENT' AS type, 'BILGI' AS priority,
          s.title, s.body, '/notifications' AS "actionUrl", 'system-message:' || s.id || ':' || u.id AS "eventKey"
        FROM "SystemMessage" s JOIN "User" u ON u."isApproved" = true AND u."adminVisible" = true
        WHERE s."createdAt" >= ${since} AND btrim(s.title) <> '' AND btrim(s.body) <> '' AND (
          s."targetType" = 'TUM_KULLANICILAR' OR s."targetType" = 'TEK_KULLANICI' AND s."targetUserId" = u.id
          OR s."targetType" = 'EMLAKCILAR' AND u.role = 'EMLAKCI' OR s."targetType" = 'MUTEAHHITLER' AND u.role = 'MUTEAHHIT'
          OR s."targetType" = 'INSAAT_FIRMALARI' AND u.role = 'INSAAT_FIRMASI' OR s."targetType" = 'ADMINLER' AND u.role = 'ADMIN'
          OR s."targetType" = 'SUPER_ADMINLER' AND u.role = 'SUPER_ADMIN'
          OR s."targetType" = 'SEHIRLER' AND (u.city = ANY(s."targetCities") OR u."cityPlateCode" = ANY(s."targetCityPlateCodes"))
          OR s."targetType" = 'SEHIRLER_VE_ROLLER' AND u.role::text = ANY(s."targetRoles")
            AND (u.city = ANY(s."targetCities") OR u."cityPlateCode" = ANY(s."targetCityPlateCodes")))`,
    ];
  }

  async expiringMemberships() {
    // Istanbul midnight + three calendar days, expressed as UTC for timestamp columns.
    const localDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const from = new Date(localDay + 'T00:00:00+03:00');
    from.setUTCDate(from.getUTCDate() + 3);
    const until = new Date(from.getTime() + 86400000);
    const source = Prisma.sql`
      SELECT m."kullaniciId" AS "userId", 'MEMBERSHIP_EXPIRING' AS type, 'ONEMLI' AS priority,
        CASE WHEN p."paketKodu" = 'DENEME' THEN 'Denemenizin bitmesine 3 gün kaldı' ELSE 'Üyeliğinizin bitmesine 3 gün kaldı' END AS title,
        'Üyelik durumunuzu uygulamadan kontrol edebilirsiniz.' AS body, '/uyelik' AS "actionUrl",
        'membership-expiry:' || m.id || ':' || m."bitisTarihi"::text AS "eventKey"
      FROM "KullaniciUyelikPaketi" m JOIN "UyelikPaketi" p ON p.id = m."paketId" JOIN "User" u ON u.id = m."kullaniciId"
      WHERE m.durum = 'AKTIF' AND m."bitisTarihi" >= ${from} AND m."bitisTarihi" < ${until}`;
    while ((await this.publish(source)) === 100) {
      /* Drain all today's recipients in bounded pages. */
    }
    const offices = Prisma.sql`
      SELECT o."ownerUserId" AS "userId", 'MEMBERSHIP_EXPIRING' AS type, 'ONEMLI' AS priority,
        'Ofis üyeliğinizin / denemenizin bitmesine 3 gün kaldı' AS title,
        'Ofis üyelik durumunuzu uygulamadan kontrol edebilirsiniz.' AS body, '/office' AS "actionUrl",
        'office-expiry:' || s.key || ':' || (s."valueJson"->>'expiresAt') AS "eventKey"
      FROM "SystemSetting" s JOIN "Office" o ON o.id = s."valueJson"->>'officeId'
      WHERE s.key LIKE 'OFFICE_SUBSCRIPTION_%' AND o."isActive" = true AND o."ownerUserId" IS NOT NULL
        AND s."valueJson"->>'expiresAt' >= ${from.toISOString()} AND s."valueJson"->>'expiresAt' < ${until.toISOString()}`;
    while ((await this.publish(offices)) === 100) {
      /* Office packages use SystemSetting, not individual memberships. */
    }
  }
}
