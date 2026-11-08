import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type PresenceStatus = 'online' | 'away' | 'offline';

export function formatPageTitle(page: string): string {
  const p = (page || '').toLowerCase();
  if (p === '/' || p === '/dashboard' || p === '/anasayfa') return 'Ana Sayfa';
  if (p.includes('havuz') && !p.includes('office')) return 'Portföy Havuzu';
  if (p.includes('office-pool')) return 'Ofis Portföy Havuzu';
  if (p.includes('crm') || p.includes('customer') || p.includes('musteri')) return 'Müşteri Yönetimi (CRM)';
  if (p.includes('portfolio') || p.includes('portfoy')) return 'Portföy Yönetimi';
  if (p.includes('office-performance-league')) return 'Ofis > Broker Ligi & Radar';
  if (p.includes('office-contracts')) return 'Ofis > Dijital Sözleşmeler';
  if (p.includes('office-owner-crm')) return 'Ofis > Ofis Sahibi CRM';
  if (p.includes('office-invite')) return 'Ofis > Danışman Davet';
  if (p.includes('office-section')) return 'Ofis Modülü';
  if (p.includes('office')) return 'Ofisim';
  if (p.includes('projects') || p.includes('proje')) return 'Proje Yönetimi';
  if (p.includes('talep')) return 'Talep Havuzu';
  if (p.includes('admin/online-activity')) return 'Yönetici > Canlı Aktivite Takibi';
  if (p.includes('admin/users')) return 'Yönetici > Kullanıcı Yönetimi';
  if (p.includes('admin/reports')) return 'Yönetici > Sistem Raporları';
  if (p.includes('admin/organization')) return 'Yönetici > Organizasyon';
  if (p.includes('admin/permission')) return 'Yönetici > Yetki Merkezi';
  if (p.includes('admin/audit')) return 'Yönetici > Denetim Kayıtları';
  if (p.includes('admin')) return 'Yönetici Paneli';
  if (p.includes('notifications') || p.includes('bildirim')) return 'Bildirimler';
  if (p.includes('messages') || p.includes('sohbet') || p.includes('chat')) return 'Mesajlaşma';
  if (p.includes('profile') || p.includes('profil')) return 'Profil & Ayarlar';
  if (p.includes('lina')) return 'Lina AI';
  if (p.includes('login') || p.includes('giris')) return 'Giriş Ekranı';
  return page || 'Bilinmeyen Bölüm';
}

@Injectable()
export class VisitsService {
  constructor(private prisma: PrismaService) {}

  async logVisit(data: {
    userId?: string;
    page: string;
    durationSeconds?: number;
    visitId?: string;
    ip?: string;
    userAgent?: string;
  }) {
    // 1. Eğer visitId verilmişse mevcut ziyareti güncelle
    if (data.visitId) {
      try {
        const existing = await this.prisma.userVisit.findUnique({
          where: { id: data.visitId },
        });
        if (existing) {
          const updated = await this.prisma.userVisit.update({
            where: { id: data.visitId },
            data: {
              durationSeconds: Math.max(
                existing.durationSeconds || 0,
                Math.round(Number(data.durationSeconds || 0)),
              ),
            },
          });
          return updated;
        }
      } catch (e) {
        // Hata durumunda yeni kayıt yoluna devam et
      }
    }

    // 2. Yeni ziyaret kaydı oluştur
    const requestedUserId = data.userId?.trim() || null;
    let safeUserId: string | null = null;

    if (requestedUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: requestedUserId },
        select: { id: true },
      });
      safeUserId = user?.id || null;
    }

    return this.prisma.userVisit.create({
      data: {
        userId: safeUserId,
        page: data.page,
        durationSeconds: Math.max(0, Math.round(Number(data.durationSeconds || 0))),
        ip: data.ip,
        userAgent: data.userAgent,
      },
    });
  }

  async getVisits(page?: string, userId?: string) {
    return this.prisma.userVisit.findMany({
      where: {
        ...(page ? { page } : {}),
        ...(userId ? { userId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
    });
  }

  calculatePresence(lastSeenAt: Date | null): { status: PresenceStatus; minutesAgo: number | null } {
    const now = Date.now();
    const diffMinutes = lastSeenAt
      ? Math.floor((now - new Date(lastSeenAt).getTime()) / 60000)
      : null;

    let status: PresenceStatus = 'offline';

    if (diffMinutes !== null && diffMinutes <= 5) {
      status = 'online';
    } else if (diffMinutes !== null && diffMinutes <= 20) {
      status = 'away';
    }

    return {
      status,
      minutesAgo: diffMinutes,
    };
  }

  async getPresence(currentUserId?: string) {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        profileImageUrl: true,
        visits: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            page: true,
            durationSeconds: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const result: Record<PresenceStatus, any[]> = {
      online: [],
      away: [],
      offline: [],
    };

    let currentUser: any = null;

    for (const user of users) {
      const lastVisit = user.visits[0] || null;
      const lastSeenAt = lastVisit?.createdAt || null;
      const presence = this.calculatePresence(lastSeenAt);

      const payload = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName:
          `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
          user.email,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        status: presence.status,
        lastSeenAt,
        lastPage: lastVisit?.page || null,
        lastPageTitle: lastVisit?.page ? formatPageTitle(lastVisit.page) : null,
        durationSeconds: lastVisit?.durationSeconds || 0,
        minutesAgo: presence.minutesAgo,
      };

      result[presence.status].push(payload);

      if (currentUserId && user.id === currentUserId) {
        currentUser = payload;
      }
    }

    return {
      currentUser,
      online: result.online,
      away: result.away,
      offline: result.offline,
    };
  }

  /**
   * Süper Admin Canlı Aktivite & Ekran Süreleri Takip Servisi (EPH_KURALLARI §0)
   */
  async getLiveActivity(actorId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true },
    });

    if (actor?.role !== 'SUPER_ADMIN' && actor?.role !== 'ADMIN') {
      throw new ForbiddenException('Bu panel yalnız Yazılım Ekibi / Süper Admin erişimine açıktır.');
    }

    // Tüm kullanıcılar ve son 25 sayfa ziyaretleri
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        memberCode: true,
        city: true,
        district: true,
        profileImageUrl: true,
        visits: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 25,
          select: {
            id: true,
            page: true,
            durationSeconds: true,
            createdAt: true,
            ip: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const activeList: any[] = [];
    let onlineCount = 0;
    let awayCount = 0;
    let offlineCount = 0;

    for (const u of users) {
      const visits = u.visits || [];
      const lastVisit = visits[0] || null;
      const lastSeenAt = lastVisit?.createdAt || null;
      const presence = this.calculatePresence(lastSeenAt);

      if (presence.status === 'online') onlineCount++;
      else if (presence.status === 'away') awayCount++;
      else offlineCount++;

      // Sayfa geçmişi detayları (formatlanmış)
      const pageHistory = visits.map((v) => ({
        id: v.id,
        rawPage: v.page,
        pageTitle: formatPageTitle(v.page),
        durationSeconds: v.durationSeconds || 0,
        createdAt: v.createdAt,
        ip: v.ip,
      }));

      // Toplam kayıtlı kullanım süresi (saniye)
      const totalRecordedSeconds = visits.reduce(
        (sum, v) => sum + (v.durationSeconds || 0),
        0,
      );

      activeList.push({
        userId: u.id,
        fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'İsimsiz Kullanıcı',
        email: u.email,
        phone: u.phone,
        role: u.role,
        memberCode: u.memberCode,
        location: [u.city, u.district].filter(Boolean).join(' / ') || 'Konum belirtilmedi',
        profileImageUrl: u.profileImageUrl,
        presenceStatus: presence.status,
        minutesAgo: presence.minutesAgo,
        lastSeenAt,
        currentPage: lastVisit?.page ? formatPageTitle(lastVisit.page) : 'Henüz giriş kaydı yok',
        currentRawPage: lastVisit?.page || null,
        currentDurationSeconds: lastVisit?.durationSeconds || 0,
        totalRecordedSeconds,
        historyCount: visits.length,
        pageHistory,
      });
    }

    // Sıralama: Önce Online olanlar, sonra Away, sonra en son aktif olanlar
    const statusPriority: Record<string, number> = { online: 0, away: 1, offline: 2 };
    activeList.sort((a, b) => {
      const pA = statusPriority[a.presenceStatus] ?? 3;
      const pB = statusPriority[b.presenceStatus] ?? 3;
      if (pA !== pB) return pA - pB;
      const timeA = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const timeB = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return timeB - timeA;
    });

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalUsers: users.length,
        onlineCount,
        awayCount,
        offlineCount,
      },
      users: activeList,
    };
  }
}
