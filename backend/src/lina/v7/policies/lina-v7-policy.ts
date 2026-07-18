export type LinaV7Role =
  | 'EMLAKCI'
  | 'MUTEAHHIT'
  | 'INSAAT_FIRMASI'
  | 'MODERATOR'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export type LinaV7Capability = 'TEAM_LEADER' | 'OFFICE_OWNER';

export type LinaV7Module =
  | 'general'
  | 'dashboard'
  | 'portfolio'
  | 'crm'
  | 'forum'
  | 'pool'
  | 'project_sales'
  | 'notifications'
  | 'tasks'
  | 'admin'
  | 'audit';

export type LinaV7Operation =
  | 'CHAT'
  | 'READ'
  | 'READ_PRIVATE_CONTENT'
  | 'READ_ANONYMIZED_METRICS'
  | 'CREATE_DRAFT'
  | 'UPDATE_DRAFT'
  | 'REQUEST_CREATE'
  | 'REQUEST_UPDATE'
  | 'REQUEST_DELETE'
  | 'REQUEST_SEND'
  | 'REQUEST_SPEND_CREDITS'
  | 'REVIEW_DOCUMENT'
  | 'APPROVE'
  | 'MANAGE_USER'
  | 'CHANGE_ROLE'
  | 'READ_SYSTEM_MESSAGES'
  | 'READ_AUDIT_LOG';

export type LinaV7ResourceScope =
  | 'OWN'
  | 'TEAM'
  | 'OTHER_USER'
  | 'PLATFORM';

export type LinaV7PolicyInput = {
  userId?: string;
  role?: string;
  capabilities?: string[];
  module: LinaV7Module;
  operation: LinaV7Operation;
  scope?: LinaV7ResourceScope;
  isResourceOwner?: boolean;
};

export type LinaV7PolicyDecision = {
  allowed: boolean;
  reason?: string;
  backendOnly: true;
  requiresExplicitConfirmation: boolean;
  normalizedRole: LinaV7Role | null;
  capabilities: LinaV7Capability[];
};

const MODULES_BY_ROLE: Record<LinaV7Role, LinaV7Module[]> = {
  EMLAKCI: [
    'general',
    'dashboard',
    'portfolio',
    'crm',
    'forum',
    'pool',
    'notifications',
    'tasks',
  ],
  MUTEAHHIT: [
    'general',
    'dashboard',
    'portfolio',
    'crm',
    'forum',
    'pool',
    'project_sales',
    'notifications',
    'tasks',
  ],
  INSAAT_FIRMASI: [
    'general',
    'dashboard',
    'portfolio',
    'crm',
    'forum',
    'pool',
    'project_sales',
    'notifications',
    'tasks',
  ],
  MODERATOR: [
    'general',
    'dashboard',
    'portfolio',
    'forum',
    'notifications',
    'admin',
  ],
  ADMIN: [
    'general',
    'dashboard',
    'portfolio',
    'forum',
    'notifications',
    'admin',
  ],
  SUPER_ADMIN: [
    'general',
    'dashboard',
    'portfolio',
    'crm',
    'forum',
    'pool',
    'project_sales',
    'notifications',
    'tasks',
    'admin',
    'audit',
  ],
};

const CONFIRMATION_REQUIRED_OPERATIONS = new Set<LinaV7Operation>([
  'REQUEST_CREATE',
  'REQUEST_UPDATE',
  'REQUEST_DELETE',
  'REQUEST_SEND',
  'REQUEST_SPEND_CREDITS',
  'APPROVE',
  'CHANGE_ROLE',
]);

export function normalizeLinaV7Role(role?: string): LinaV7Role | null {
  const normalized = normalizeKey(role);

  if (normalized === 'EMLAKCI') return 'EMLAKCI';
  if (normalized === 'MUTEAHHIT') return 'MUTEAHHIT';

  if (
    normalized === 'INSAAT_FIRMASI' ||
    normalized === 'INSAATFIRMASI'
  ) {
    return 'INSAAT_FIRMASI';
  }

  if (normalized === 'MODERATOR') return 'MODERATOR';
  if (normalized === 'ADMIN') return 'ADMIN';

  if (
    normalized === 'SUPER_ADMIN' ||
    normalized === 'SUPERADMIN'
  ) {
    return 'SUPER_ADMIN';
  }

  return null;
}

export function normalizeLinaV7Capabilities(
  capabilities?: string[],
): LinaV7Capability[] {
  const normalized = new Set<LinaV7Capability>();

  for (const capability of capabilities || []) {
    const key = normalizeKey(capability);

    if (key === 'TEAM_LEADER') {
      normalized.add('TEAM_LEADER');
    }

    if (key === 'OFFICE_OWNER') {
      normalized.add('OFFICE_OWNER');
    }
  }

  return [...normalized];
}

export function evaluateLinaV7Policy(
  input: LinaV7PolicyInput,
): LinaV7PolicyDecision {
  const role = normalizeLinaV7Role(input.role);
  const capabilities = normalizeLinaV7Capabilities(input.capabilities);
  const requiresExplicitConfirmation =
    CONFIRMATION_REQUIRED_OPERATIONS.has(input.operation);

  const baseDecision = {
    backendOnly: true as const,
    requiresExplicitConfirmation,
    normalizedRole: role,
    capabilities,
  };

  if (!input.userId) {
    return {
      ...baseDecision,
      allowed: false,
      reason: 'Bu işlem için EPH hesabınızla giriş yapmanız gerekir.',
    };
  }

  if (!role) {
    return {
      ...baseDecision,
      allowed: false,
      reason: 'Kullanıcı rolü doğrulanamadığı için işlem başlatılamaz.',
    };
  }

  if (!MODULES_BY_ROLE[role].includes(input.module)) {
    return {
      ...baseDecision,
      allowed: false,
      reason: 'Bu modüle erişim yetkiniz bulunmamaktadır.',
    };
  }

  if (input.operation === 'CHAT') {
    return {
      ...baseDecision,
      allowed: true,
    };
  }

  if (input.module === 'audit') {
    return role === 'SUPER_ADMIN'
      ? { ...baseDecision, allowed: true }
      : {
          ...baseDecision,
          allowed: false,
          reason: 'Audit Log yalnız Yazılım Ekibi tarafından görüntülenebilir.',
        };
  }

  if (input.operation === 'READ_AUDIT_LOG') {
    return role === 'SUPER_ADMIN'
      ? { ...baseDecision, allowed: true }
      : {
          ...baseDecision,
          allowed: false,
          reason: 'Audit Log yalnız Yazılım Ekibi tarafından görüntülenebilir.',
        };
  }

  if (input.operation === 'READ_SYSTEM_MESSAGES') {
    return role === 'SUPER_ADMIN'
      ? { ...baseDecision, allowed: true }
      : {
          ...baseDecision,
          allowed: false,
          reason:
            'Sistem mesajları yalnız Yazılım Ekibi tarafından görüntülenebilir.',
        };
  }

  if (input.operation === 'CHANGE_ROLE') {
    return role === 'SUPER_ADMIN'
      ? { ...baseDecision, allowed: true }
      : {
          ...baseDecision,
          allowed: false,
          reason:
            'Rol ve yetki değişiklikleri yalnız Yazılım Ekibi tarafından yapılabilir.',
        };
  }

  if (input.operation === 'MANAGE_USER') {
    return role === 'ADMIN' || role === 'SUPER_ADMIN'
      ? { ...baseDecision, allowed: true }
      : {
          ...baseDecision,
          allowed: false,
          reason: 'Kullanıcı yönetimi yetkiniz bulunmamaktadır.',
        };
  }

  if (
    input.module === 'portfolio' &&
    input.operation === 'REVIEW_DOCUMENT'
  ) {
    return role === 'MODERATOR' ||
      role === 'ADMIN' ||
      role === 'SUPER_ADMIN'
      ? { ...baseDecision, allowed: true }
      : {
          ...baseDecision,
          allowed: false,
          reason:
            'Portföy belgeleri yalnız yetkili inceleme sürecinde görüntülenebilir.',
        };
  }

  if (
    input.module === 'portfolio' &&
    input.operation === 'APPROVE'
  ) {
    return role === 'MODERATOR' ||
      role === 'ADMIN' ||
      role === 'SUPER_ADMIN'
      ? { ...baseDecision, allowed: true }
      : {
          ...baseDecision,
          allowed: false,
          reason: 'Portföy onaylama yetkiniz bulunmamaktadır.',
        };
  }

  if (input.module === 'crm') {
    return evaluateCrmPolicy(input, role, capabilities, baseDecision);
  }

  if (
    input.scope === 'TEAM' &&
    input.operation === 'READ_ANONYMIZED_METRICS'
  ) {
    const hasTeamCapability =
      capabilities.includes('TEAM_LEADER') ||
      capabilities.includes('OFFICE_OWNER');

    return hasTeamCapability || role === 'SUPER_ADMIN'
      ? { ...baseDecision, allowed: true }
      : {
          ...baseDecision,
          allowed: false,
          reason:
            'Takım veya ofis performans özetlerini görüntüleme yetkiniz bulunmamaktadır.',
        };
  }

  if (
    input.operation === 'READ_PRIVATE_CONTENT' &&
    input.scope === 'OTHER_USER' &&
    role !== 'SUPER_ADMIN'
  ) {
    return {
      ...baseDecision,
      allowed: false,
      reason: 'Başka kullanıcıya ait mahrem içerik görüntülenemez.',
    };
  }

  if (
    input.scope === 'OWN' ||
    input.isResourceOwner ||
    input.scope === 'PLATFORM' ||
    role === 'SUPER_ADMIN'
  ) {
    return {
      ...baseDecision,
      allowed: true,
    };
  }

  if (input.operation === 'READ') {
    return {
      ...baseDecision,
      allowed: true,
    };
  }

  return {
    ...baseDecision,
    allowed: false,
    reason: 'Bu işlem için gerekli sahiplik veya yetki doğrulanamadı.',
  };
}

function evaluateCrmPolicy(
  input: LinaV7PolicyInput,
  role: LinaV7Role,
  capabilities: LinaV7Capability[],
  baseDecision: Omit<
    LinaV7PolicyDecision,
    'allowed' | 'reason'
  >,
): LinaV7PolicyDecision {
  if (role === 'ADMIN' || role === 'MODERATOR') {
    if (input.operation === 'READ_ANONYMIZED_METRICS') {
      return {
        ...baseDecision,
        allowed: true,
      };
    }

    return {
      ...baseDecision,
      allowed: false,
      reason:
        'CRM içerikleri yalnız kayıt sahibi ve Yazılım Ekibi tarafından görüntülenebilir.',
    };
  }

  if (role === 'SUPER_ADMIN') {
    return {
      ...baseDecision,
      allowed: true,
    };
  }

  if (input.scope === 'OWN' || input.isResourceOwner) {
    return {
      ...baseDecision,
      allowed: true,
    };
  }

  if (
    input.scope === 'TEAM' &&
    input.operation === 'READ_ANONYMIZED_METRICS'
  ) {
    const hasTeamCapability =
      capabilities.includes('TEAM_LEADER') ||
      capabilities.includes('OFFICE_OWNER');

    return hasTeamCapability
      ? { ...baseDecision, allowed: true }
      : {
          ...baseDecision,
          allowed: false,
          reason:
            'Takım veya ofis CRM özetlerini görüntüleme yetkiniz bulunmamaktadır.',
        };
  }

  return {
    ...baseDecision,
    allowed: false,
    reason:
      'Başka kullanıcıya ait CRM kayıtlarının içeriği görüntülenemez.',
  };
}

function normalizeKey(value?: string): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/Ü/g, 'U')
    .replace(/Ğ/g, 'G')
    .replace(/Ş/g, 'S')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[\s-]+/g, '_');
}
