import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { ADMIN_EMAIL_RECIPIENT, AdminEmailEvent, renderAdminEmail } from './admin-email.template';

export const MAX_ADMIN_EMAIL_ATTEMPTS = 8;
export function retryDelay(attempt: number) { return Math.min(3600000, 30000 * 2 ** Math.max(0, attempt - 1)); }

@Injectable()
export class AdminEmailService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AdminEmailService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private stopping = false;
  private transport?: nodemailer.Transporter;

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap() {
    this.timer = setInterval(() => { void this.tick(); }, 30000);
    this.timer.unref();
  }

  async onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await this.running;
    this.transport?.close();
  }

  async tick() {
    if (this.stopping || this.running) return;
    this.running = this.run().catch(() => this.logger.error('ADMIN_EMAIL_WORKER_FAILED: kuyruk sonraki turda yeniden denenecek.'));
    try { await this.running; } finally { this.running = undefined; }
  }

  private async enabled() {
    const rows = await this.prisma.$queryRaw<Array<{ enabled: boolean; recipient: string }>>`
      SELECT "enabled", "recipient" FROM "AdminEmailSetting" WHERE "id" = 'main'`;
    return rows[0]?.enabled === true && rows[0]?.recipient === ADMIN_EMAIL_RECIPIENT;
  }

  private getTransport() {
    if (this.transport) return this.transport;
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) throw Object.assign(new Error('SMTP configuration missing'), { code: 'CONFIG' });
    const port = Number(process.env.SMTP_PORT || 587);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw Object.assign(new Error('SMTP port invalid'), { code: 'CONFIG' });
    this.transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.kurumsaleposta.com', port,
      secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false' },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    });
    return this.transport;
  }

  private async reconcile() {
    await this.prisma.$executeRaw`
      INSERT INTO "AdminEmailOutbox" ("id", "eventKey", "recipient", "category", "entityType", "entityId", "title", "summary", "updatedAt")
      SELECT 'reconcile_' || md5(o."id"), 'PAYMENT_UNSETTLED:' || o."id", ${ADMIN_EMAIL_RECIPIENT},
        'PAYMENT_UNSETTLED', 'PaymentOrder', o."id", 'Ödeme tamamlandı; hak tanımlaması kontrol edilmeli',
        'Üzerinden en az 5 dakika geçen başarılı ödeme için üyelik veya PK mutabakat kaydı bulunamadı.', CURRENT_TIMESTAMP
      FROM "PaymentOrder" o WHERE o."durum" = 'PAID' AND o."paidAt" < CURRENT_TIMESTAMP - INTERVAL '5 minutes'
        AND NOT EXISTS (SELECT 1 FROM "PaymentSettlement" s WHERE s."orderId" = o."id")
      ON CONFLICT ("eventKey") DO NOTHING`;
  }

  private async claim(token: string) {
    return this.prisma.$queryRaw<AdminEmailEvent[]>`
      WITH candidates AS (
        SELECT q."id" FROM "AdminEmailOutbox" q
        WHERE q."recipient" = ${ADMIN_EMAIL_RECIPIENT}
          AND q."attempts" < ${MAX_ADMIN_EMAIL_ATTEMPTS}
          AND ((q."status" = 'PENDING' AND q."availableAt" <= CURRENT_TIMESTAMP)
            OR (q."status" = 'SENDING' AND q."leaseUntil" < CURRENT_TIMESTAMP))
          AND EXISTS (SELECT 1 FROM "AdminEmailSetting" WHERE "id" = 'main' AND "enabled" = true AND "recipient" = ${ADMIN_EMAIL_RECIPIENT})
        ORDER BY q."createdAt", q."id" FOR UPDATE SKIP LOCKED LIMIT 3
      )
      UPDATE "AdminEmailOutbox" q SET "status" = 'SENDING', "attempts" = q."attempts" + 1,
        "leaseToken" = ${token}, "leaseUntil" = CURRENT_TIMESTAMP + INTERVAL '10 minutes', "updatedAt" = CURRENT_TIMESTAMP
      FROM candidates c WHERE q."id" = c."id"
      RETURNING q."id", q."recipient", q."category", q."entityType", q."entityId", q."title", q."summary", q."actorLabel", q."createdAt", q."attempts"`;
  }

  private async release(event: AdminEmailEvent, token: string) {
    await this.prisma.$executeRaw`UPDATE "AdminEmailOutbox" SET "status" = 'PENDING', "attempts" = GREATEST(0, "attempts" - 1),
      "leaseToken" = NULL, "leaseUntil" = NULL, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${event.id} AND "leaseToken" = ${token} AND "status" = 'SENDING'`;
  }

  private async run() {
    if (!(await this.enabled())) return;
    await this.reconcile();
    await this.prisma.$executeRaw`UPDATE "AdminEmailOutbox" SET "status" = 'DEAD', "leaseToken" = NULL, "leaseUntil" = NULL,
      "lastErrorCode" = 'ATTEMPTS_EXHAUSTED', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "status" = 'SENDING' AND "leaseUntil" < CURRENT_TIMESTAMP AND "attempts" >= ${MAX_ADMIN_EMAIL_ATTEMPTS}`;
    const token = randomUUID();
    const events = await this.claim(token);
    for (const event of events) {
      if (this.stopping || !(await this.enabled())) { await this.release(event, token); continue; }
      let sent = false;
      try {
        const from = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
        if (!from || /[\r\n]/.test(from)) throw Object.assign(new Error('SMTP sender missing'), { code: 'CONFIG' });
        const result = await this.getTransport().sendMail({
          from: { name: process.env.SMTP_FROM_NAME || 'EPH Platform', address: from },
          to: ADMIN_EMAIL_RECIPIENT,
          messageId: `<eph-admin-${event.id.replace(/[^A-Za-z0-9_-]/g, '')}@emlakportfoyhavuzu.com>`,
          ...renderAdminEmail(event),
        });
        if (!Array.isArray(result.accepted) || !result.accepted.some((address: unknown) => String(address).toLowerCase() === ADMIN_EMAIL_RECIPIENT)) {
          throw Object.assign(new Error('SMTP recipient rejected'), { code: 'RECIPIENT_REJECTED' });
        }
        sent = true;
        await this.prisma.$executeRaw`UPDATE "AdminEmailOutbox" SET "status" = 'SENT', "sentAt" = CURRENT_TIMESTAMP,
          "leaseToken" = NULL, "leaseUntil" = NULL, "lastErrorCode" = NULL, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${event.id} AND "leaseToken" = ${token} AND "status" = 'SENDING'`;
      } catch (issue) {
        if (sent) { this.logger.error(`ADMIN_EMAIL_ACK_FAILED: ${event.id}`); continue; }
        const code = (issue as { code?: string })?.code;
        const safeCode = ['CONFIG', 'EAUTH', 'ESOCKET', 'ETIMEDOUT', 'ECONNECTION', 'EENVELOPE', 'EMESSAGE', 'RECIPIENT_REJECTED'].includes(code || '') ? code! : 'SEND_FAILED';
        const delay = retryDelay(event.attempts);
        const status = event.attempts >= MAX_ADMIN_EMAIL_ATTEMPTS ? 'DEAD' : 'PENDING';
        await this.prisma.$executeRaw`UPDATE "AdminEmailOutbox" SET "status" = ${status}, "availableAt" = CURRENT_TIMESTAMP + ${delay} * INTERVAL '1 millisecond',
          "leaseToken" = NULL, "leaseUntil" = NULL, "lastErrorCode" = ${safeCode}, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${event.id} AND "leaseToken" = ${token} AND "status" = 'SENDING'`;
        this.logger.warn(`ADMIN_EMAIL_${status}: ${event.id} (${safeCode})`);
      }
    }
  }
}
