import { UnitType } from '@prisma/client';

import {
  CARD_PROFILES,
  getCanonicalCardProfileBindingCount,
  getUnmappedUnitTypes,
  normalizePropertyCardValue,
} from './property-card-profile.registry';
import { PropertyCardProfileService } from './property-card-profile.service';

describe('PropertyCardProfile registry V1.3', () => {
  const service = new PropertyCardProfileService();

  it('14 ana CardProfile tanımlar ve her biri tam 8 slot içerir', () => {
    expect(Object.keys(CARD_PROFILES)).toHaveLength(14);

    for (const profile of Object.values(CARD_PROFILES)) {
      expect(profile.slots).toHaveLength(8);
      expect(new Set(profile.slots.map((slot) => slot.key)).size).toBe(8);
    }
  });

  it('Excel V1.2 kanonik haritasındaki 93 UnitType eşlemesini korur', () => {
    expect(getCanonicalCardProfileBindingCount()).toBe(93);
  });

  it('mevcut Prisma enumundaki yalnız DIGER tipini yayın dışı bırakır', () => {
    expect(getUnmappedUnitTypes()).toEqual([UnitType.DIGER]);
  });

  it('Villa/Müstakil profilinde klasik kat sayısı yerine yapı tipini kullanır', () => {
    const profile = service.getProfile('VILLA');

    expect(profile.profile.slots[3]).toMatchObject({
      key: 'structureType',
      label: 'Villa Tipi',
    });

    expect(profile.profile.slots.some((slot) => slot.key === 'totalFloors')).toBe(
      false,
    );
  });

  it('müstakil ev için aynı slotu Yapı Tipi etiketiyle döndürür', () => {
    const profile = service.getProfile('MUSTAK_EV');

    expect(profile.profile.slots[3]).toMatchObject({
      key: 'structureType',
      label: 'Yapı Tipi',
    });
  });

  it('Dubleks/Tripleks villa alt tipini UnitType üzerinden çözer', () => {
    const duplex = service.resolve({
      unitType: 'DUBLEKS_VILLA',
      values: {},
    });
    const triplex = service.resolve({
      unitType: 'TRIPLEKS_VILLA',
      values: {},
    });

    expect(duplex.slots[3].value).toBe('Dubleks Villa');
    expect(triplex.slots[3].value).toBe('Tripleks Villa');
  });

  it('legacy Fourplex Villa değerini 4 Katlı Villa olarak normalize eder', () => {
    expect(normalizePropertyCardValue('Fourplex Villa')).toBe('4 Katlı Villa');

    const result = service.resolve({
      unitType: 'VILLA',
      values: { villaType: 'Fourplex Villa' },
    });

    expect(result.slots[3].value).toBe('4 Katlı Villa');
  });

  it('Müstakil evde homeType değerini yapı tipi olarak çözer', () => {
    const result = service.resolve({
      unitType: 'MUSTAK_EV',
      values: { homeType: 'Dubleks Ev' },
    });

    expect(result.slots[3]).toMatchObject({
      label: 'Yapı Tipi',
      value: 'Dubleks Ev',
      complete: true,
    });
  });

  it('DIGER tipini somut tipe dönüştürmeden CardProfile üretmez', () => {
    expect(() => service.getProfile('DIGER')).toThrow(
      /somut bir gayrimenkul tipine/,
    );
  });
});
