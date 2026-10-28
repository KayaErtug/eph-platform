import { UnitType } from '@prisma/client';

import { CrmService } from './crm.service';

describe('CRM CardProfile criteria normalization', () => {
  const service = new CrmService({} as any, {} as any, {} as any);
  const normalize = (value: unknown) =>
    (service as any).normalizeCardProfileCriteria(value, [UnitType.DAIRE]);

  it('preserves canonical priority rules and the demand group identifier', () => {
    expect(normalize({
      version: '1.3',
      profile: 'DAIRE',
      values: { roomCount: ['3+1', '3+2', '4+1'], facade: ['Güney'] },
      priorities: { roomCount: 'MUST', facade: 'PREFERENCE', elevatorStatus: 'ANY' },
      demandGroupId: 'demand-group-123',
    })).toEqual({
      version: '1.3',
      profile: 'DAIRE',
      values: { roomCount: ['3+1', '3+2', '4+1'], facade: ['Güney'] },
      priorities: { roomCount: 'MUST', facade: 'PREFERENCE', elevatorStatus: 'ANY' },
      demandGroupId: 'demand-group-123',
    });
  });

  it('keeps legacy criteria without assigning priorities', () => {
    expect(normalize({ profile: 'DAIRE', values: { roomCount: ['3+1'] } })).toEqual({
      version: '1.3',
      profile: 'DAIRE',
      values: { roomCount: ['3+1'] },
    });
  });

  it('rejects unknown priority values', () => {
    expect(() => normalize({ profile: 'DAIRE', values: {}, priorities: { facade: 'HIGH' } })).toThrow('Geçersiz kriter önceliği');
  });
});
