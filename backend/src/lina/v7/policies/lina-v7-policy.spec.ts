import {
  evaluateLinaV7Policy,
  normalizeLinaV7Capabilities,
  normalizeLinaV7Role,
} from './lina-v7-policy';

describe('Lina V7 Policy', () => {
  it('SUPER_ADMIN rolünü doğru normalize eder', () => {
    expect(normalizeLinaV7Role('SUPER_ADMIN')).toBe('SUPER_ADMIN');
    expect(normalizeLinaV7Role('superadmin')).toBe('SUPER_ADMIN');
  });

  it('TEAM_LEADER ve OFFICE_OWNER yeteneklerini doğru normalize eder', () => {
    expect(
      normalizeLinaV7Capabilities([
        'TEAM_LEADER',
        'office-owner',
        'TEAM_LEADER',
      ]),
    ).toEqual(['TEAM_LEADER', 'OFFICE_OWNER']);
  });

  it('giriş yapmamış kullanıcının işlem başlatmasını engeller', () => {
    const result = evaluateLinaV7Policy({
      module: 'general',
      operation: 'CHAT',
    });

    expect(result.allowed).toBe(false);
    expect(result.backendOnly).toBe(true);
  });

  it('giriş yapmış kullanıcının doğal sohbet etmesine izin verir', () => {
    const result = evaluateLinaV7Policy({
      userId: 'user-1',
      role: 'EMLAKCI',
      module: 'general',
      operation: 'CHAT',
    });

    expect(result.allowed).toBe(true);
    expect(result.requiresExplicitConfirmation).toBe(false);
  });

  it('portföy oluşturma isteğinde açık onay zorunluluğu üretir', () => {
    const result = evaluateLinaV7Policy({
      userId: 'user-1',
      role: 'EMLAKCI',
      module: 'portfolio',
      operation: 'REQUEST_CREATE',
      scope: 'OWN',
      isResourceOwner: true,
    });

    expect(result.allowed).toBe(true);
    expect(result.requiresExplicitConfirmation).toBe(true);
  });

  it('ADMIN kullanıcısının CRM özel içeriğine erişmesini engeller', () => {
    const result = evaluateLinaV7Policy({
      userId: 'admin-1',
      role: 'ADMIN',
      module: 'crm',
      operation: 'READ_PRIVATE_CONTENT',
      scope: 'OTHER_USER',
    });

    expect(result.allowed).toBe(false);
  });

  it('Yazılım Ekibinin Audit Log erişimine izin verir', () => {
    const result = evaluateLinaV7Policy({
      userId: 'super-1',
      role: 'SUPER_ADMIN',
      module: 'audit',
      operation: 'READ_AUDIT_LOG',
      scope: 'PLATFORM',
    });

    expect(result.allowed).toBe(true);
  });

  it('Emlakçının Audit Log erişimini engeller', () => {
    const result = evaluateLinaV7Policy({
      userId: 'user-1',
      role: 'EMLAKCI',
      module: 'audit',
      operation: 'READ_AUDIT_LOG',
      scope: 'PLATFORM',
    });

    expect(result.allowed).toBe(false);
  });

  it('takım liderinin anonim takım metriklerine erişmesine izin verir', () => {
    const result = evaluateLinaV7Policy({
      userId: 'leader-1',
      role: 'EMLAKCI',
      capabilities: ['TEAM_LEADER'],
      module: 'crm',
      operation: 'READ_ANONYMIZED_METRICS',
      scope: 'TEAM',
    });

    expect(result.allowed).toBe(true);
  });

  it('bilinmeyen rol ile yetkili işlem başlatmaz', () => {
    const result = evaluateLinaV7Policy({
      userId: 'user-1',
      role: 'UNKNOWN_ROLE',
      module: 'portfolio',
      operation: 'REQUEST_CREATE',
      scope: 'OWN',
    });

    expect(result.allowed).toBe(false);
    expect(result.normalizedRole).toBeNull();
  });
});
