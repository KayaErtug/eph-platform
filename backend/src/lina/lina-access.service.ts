import { Injectable } from '@nestjs/common';

export type LinaRole =
  | 'EMLAKCI'
  | 'MUTEAHHIT'
  | 'INSAAT_FIRMASI'
  | 'MODERATOR'
  | 'ADMIN'
  | 'SUPERADMIN';

export type LinaModuleName =
  | 'dashboard'
  | 'crm'
  | 'network'
  | 'pool'
  | 'notifications'
  | 'admin'
  | 'audit'
  | 'general';

export type LinaAccessUser = {
  id?: string;
  role?: string;
};

export type LinaAccessResult = {
  allowed: boolean;
  reason?: string;
};

@Injectable()
export class LinaAccessService {
  checkModuleAccess(user: LinaAccessUser | null | undefined, moduleName: LinaModuleName): LinaAccessResult {
    if (!user?.id) {
      return {
        allowed: false,
        reason: 'Bu bilgiye erişebilmem için önce EPH Platform hesabınızla giriş yapmanız gerekir.',
      };
    }

    const role = this.normalizeRole(user.role);

    if (!role) {
      return {
        allowed: false,
        reason: 'Kullanıcı rolü doğrulanamadı.',
      };
    }

    const allowedModulesByRole: Record<LinaRole, LinaModuleName[]> = {
      EMLAKCI: ['dashboard', 'crm', 'network', 'pool', 'notifications', 'general'],
      MUTEAHHIT: ['dashboard', 'crm', 'network', 'pool', 'notifications', 'general'],
      INSAAT_FIRMASI: ['dashboard', 'crm', 'network', 'pool', 'notifications', 'general'],
      MODERATOR: ['dashboard', 'network', 'notifications', 'general'],
      ADMIN: ['dashboard', 'network', 'notifications', 'admin', 'general'],
      SUPERADMIN: ['dashboard', 'crm', 'network', 'pool', 'notifications', 'admin', 'audit', 'general'],
    };

    const allowed = allowedModulesByRole[role].includes(moduleName);

    if (!allowed) {
      return {
        allowed: false,
        reason: 'Bu bilgiye erişim yetkiniz bulunmamaktadır.',
      };
    }

    return {
      allowed: true,
    };
  }

  normalizeRole(role?: string): LinaRole | null {
    const normalized = String(role || '')
      .trim()
      .toUpperCase()
      .replace('İ', 'I')
      .replace('Ü', 'U')
      .replace('Ğ', 'G')
      .replace('Ş', 'S')
      .replace('Ö', 'O')
      .replace('Ç', 'C');

    if (normalized === 'EMLAKCI' || normalized === 'EMLAKÇI') return 'EMLAKCI';
    if (normalized === 'MUTEAHHIT' || normalized === 'MÜTEAHHİT') return 'MUTEAHHIT';
    if (normalized === 'INSAAT_FIRMASI' || normalized === 'İNŞAAT_FİRMASI' || normalized === 'INSAATFIRMASI') {
      return 'INSAAT_FIRMASI';
    }
    if (normalized === 'MODERATOR' || normalized === 'MODERATÖR') return 'MODERATOR';
    if (normalized === 'ADMIN' || normalized === 'ADMİN') return 'ADMIN';
    if (normalized === 'SUPERADMIN' || normalized === 'SUPER_ADMIN' || normalized === 'SÜPERADMİN') return 'SUPERADMIN';

    return null;
  }

  getUnauthorizedMessage(): string {
    return 'Bu bilgiye erişim yetkiniz bulunmamaktadır.';
  }
}