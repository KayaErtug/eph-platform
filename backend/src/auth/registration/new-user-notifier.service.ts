import { Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminEmailService } from '../../admin-email/admin-email.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

export const NOTIFY_NEW_USER_EMAIL_KEY = 'ADMIN_NOTIFY_NEW_USER_EMAIL';
export const NOTIFY_NEW_USER_PUSH_KEY = 'ADMIN_NOTIFY_NEW_USER_PUSH';
export const NEW_USER_NOTIFY_KEYS: string[] = [NOTIFY_NEW_USER_EMAIL_KEY, NOTIFY_NEW_USER_PUSH_KEY];

export type NewUserEvent = {
  userId: string;
  firstName: string;
  lastName: string;
  role: Role;
  city?: string | null;
  district?: string | null;
  inviteCode?: string | null;
  isApproved: boolean;
};

const ROLE_LABELS: Partial<Record<Role, string>> = {
  ADAY: 'Aday',
  EMLAKCI: 'Emlak danışmanı',
  MUTEAHHIT: 'Müteahhit',
  INSAAT_FIRMASI: 'İnşaat firması',
};

/** Hesap oluştuğunda süper adminlere e-posta, uygulama içi/push ve (isteğe bağlı) Telegram bildirimi gönderir. Kayıt akışını asla bozmaz. */
@Injectable()
export class NewUserNotifierService {
  private readonly logger = new Logger(NewUserNotifierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminEmail: AdminEmailService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Kayıt işlemini beklemez; hata yalnızca loga düşer. */
  dispatch(event: NewUserEvent) {
    setImmediate(() => {
      this.notify(event).catch(() => this.logger.warn(`NEW_USER_NOTIFY_FAILED: ${event.userId}`));
    });
  }

  async notify(event: NewUserEvent) {
    const fullName = `${event.firstName} ${event.lastName}`.trim() || 'İsim bekleniyor';
    const role = ROLE_LABELS[event.role] ?? String(event.role);
    const place = [event.city, event.district].filter(Boolean).join(' / ');
    const channel = event.inviteCode ? 'Davet/referans kodu ile' : 'Doğrudan kayıt';
    const status = event.isApproved ? 'Onaylı' : 'Onay bekliyor';
    // KVKK: telefon ve e-posta hiçbir kanala yazılmaz.
    const summary = [`Rol: ${role}`, `İl/ilçe: ${place || '-'}`, `Kayıt kanalı: ${channel}`, `Onay durumu: ${status}`].join('\n');
    const title = `Yeni üye: ${fullName}`;
    const eventKey = `NEW_USER:${event.userId}`;

    const [emailOn, pushOn] = await Promise.all([this.enabled(NOTIFY_NEW_USER_EMAIL_KEY), this.enabled(NOTIFY_NEW_USER_PUSH_KEY)]);
    await Promise.all([
      emailOn ? this.guard('EMAIL', event, () => this.adminEmail.enqueue({ eventKey, category: 'NEW_USER', entityType: 'User', entityId: event.userId, title, summary })) : null,
      this.guard('PUSH', event, () => this.inApp(event, `${title} · ${role} · ${event.city || '-'}`, pushOn)),
      this.guard('TELEGRAM', event, () => this.telegram(`${title}\n${summary}`)),
    ]);
  }

  private async guard(channel: string, event: NewUserEvent, run: () => Promise<unknown>) {
    try { await run(); } catch { this.logger.warn(`NEW_USER_${channel}_FAILED: ${event.userId}`); }
  }

  /** Kayıt yoksa varsayılan açık; yalnız açıkça 0/false ise kapalı. */
  private async enabled(key: string) {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    const raw = row?.valueJson as unknown;
    const value = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as { value?: unknown }).value : raw;
    return !(row && (value === 0 || value === false || value === '0'));
  }

  /** Bildirim Merkezi kaydı her zaman oluşur; push kapalıysa kayıt aynı işlemde DISABLED işaretlenir, cihaza gönderim yapılmaz. */
  private async inApp(event: NewUserEvent, body: string, pushOn: boolean) {
    const admins = await this.prisma.user.findMany({ where: { role: Role.SUPER_ADMIN }, select: { id: true } });
    for (const admin of admins) {
      const input = {
        type: 'NEW_USER',
        priority: 'ONEMLI' as const,
        title: 'Yeni üye',
        body,
        // Dokununca yönetimdeki kullanıcı kartı: entityType=USER, entityId=userId.
        actionUrl: `/admin/users?entityType=USER&entityId=${encodeURIComponent(event.userId)}`,
        eventKey: `NEW_USER:${event.userId}:${admin.id}`,
      };
      await this.guard('PUSH', event, () => pushOn
        ? this.notifications.notify(admin.id, input)
        : this.prisma.$transaction(async (tx) => {
          await this.notifications.notify(admin.id, input, tx);
          await tx.networkNotification.updateMany({ where: { eventKey: input.eventKey, pushStatus: 'PENDING' }, data: { pushStatus: 'DISABLED' } });
        }));
    }
  }

  private async telegram(text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!token || !chatId) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(8000),
    });
  }
}
