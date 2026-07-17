import { UnitType } from '@prisma/client';

import { PropertyCriteriaService } from './property-criteria.service';

describe('PropertyCriteriaService UnitType aliases', () => {
  let service: PropertyCriteriaService;

  beforeEach(() => {
    service = new PropertyCriteriaService();
  });

  it('frontend gayrimenkul tiplerini canonical UnitType diline çevirir', () => {
    const result = service.normalize({
      recordKind: 'DEMAND',
      source: 'REQUEST_CENTER',
      propertyTypes: [
        'DAG_EVI_YAYLA_EVI',
        'APARTMAN',
        'OTEL_BINASI',
        'BENZIN_ISTASYONU',
      ],
    });

    expect(result.propertyTypes).toEqual([
      UnitType.DAG_EVI,
      UnitType.KOMPLE_BINA,
      UnitType.OTEL_PANSIYON,
      UnitType.AKARYAKIT_ISTASYONU,
    ]);
  });

  it('canonical tipleri değiştirmeden korur', () => {
    const result = service.normalize({
      recordKind: 'DEMAND',
      source: 'REQUEST_CENTER',
      propertyTypes: [
        UnitType.VILLA,
        UnitType.ARSA,
      ],
    });

    expect(result.propertyTypes).toEqual([
      UnitType.VILLA,
      UnitType.ARSA,
    ]);
  });
});
