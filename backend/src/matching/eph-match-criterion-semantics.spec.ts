import {
  CARD_PROFILE_CRITERION_SEMANTICS,
  getCriterionSemantic,
  matchesCriterion,
} from './eph-match-criterion-semantics';

describe('EPH criterion semantics', () => {
  it('covers all 14 canonical CardProfiles', () => {
    expect(
      Object.keys(CARD_PROFILE_CRITERION_SEMANTICS),
    ).toHaveLength(14);
  });

  it('gives every CardProfile exactly 8 criteria', () => {
    for (const criteria of Object.values(
      CARD_PROFILE_CRITERION_SEMANTICS,
    )) {
      expect(Object.keys(criteria)).toHaveLength(8);
    }
  });

  it('defines apartment room count as ordered minimum', () => {
    expect(
      getCriterionSemantic('DAIRE', 'roomCount').operator,
    ).toBe('ORDERED_MINIMUM');
  });

  it('accepts larger room configurations for a 2+1 minimum request', () => {
    expect(
      matchesCriterion(
        'ORDERED_MINIMUM',
        ['2+1'],
        '2+1',
      ),
    ).toBe(true);

    expect(
      matchesCriterion(
        'ORDERED_MINIMUM',
        ['2+1'],
        '3+1',
      ),
    ).toBe(true);

    expect(
      matchesCriterion(
        'ORDERED_MINIMUM',
        ['2+1'],
        '3+2',
      ),
    ).toBe(true);

    expect(
      matchesCriterion(
        'ORDERED_MINIMUM',
        ['2+1'],
        '4+2',
      ),
    ).toBe(true);

    expect(
      matchesCriterion(
        'ORDERED_MINIMUM',
        ['2+1'],
        '1+1',
      ),
    ).toBe(false);
  });

  it('treats building age as maximum', () => {
    expect(
      matchesCriterion('MAXIMUM', ['5'], '1'),
    ).toBe(true);

    expect(
      matchesCriterion('MAXIMUM', ['5'], '5'),
    ).toBe(true);

    expect(
      matchesCriterion('MAXIMUM', ['5'], '8'),
    ).toBe(false);
  });

  it('treats area and capacity style criteria as minimum', () => {
    expect(
      matchesCriterion('MINIMUM', ['120'], '160'),
    ).toBe(true);

    expect(
      matchesCriterion('MINIMUM', ['120'], '90'),
    ).toBe(false);

    expect(
      matchesCriterion(
        'MINIMUM',
        ['100 kW'],
        '150 kW',
      ),
    ).toBe(true);
  });

  it('parses decimal and Turkish thousand values safely', () => {
    expect(
      matchesCriterion(
        'MINIMUM',
        ['0.50'],
        '0.75',
      ),
    ).toBe(true);

    expect(
      matchesCriterion(
        'MINIMUM',
        ['1.500 m²'],
        '2.000 m²',
      ),
    ).toBe(true);

    expect(
      matchesCriterion(
        'MINIMUM',
        ['1.500 m²'],
        '900 m²',
      ),
    ).toBe(false);
  });

  it('treats distance style criteria as maximum', () => {
    expect(
      matchesCriterion(
        'MAXIMUM',
        ['10 km'],
        '4 km',
      ),
    ).toBe(true);

    expect(
      matchesCriterion(
        'MAXIMUM',
        ['10 km'],
        '15 km',
      ),
    ).toBe(false);
  });

  it('lets Farketmez pass every supported operator', () => {
    for (const operator of [
      'MINIMUM',
      'MAXIMUM',
      'ORDERED_MINIMUM',
      'EXACT_OR_ANY',
      'REQUIRED_OR_ANY',
      'PREFERENCE',
    ] as const) {
      expect(
        matchesCriterion(
          operator,
          ['Farketmez'],
          'herhangi bir değer',
        ),
      ).toBe(true);
    }
  });

  it('keeps exact preferences exact when not Farketmez', () => {
    expect(
      matchesCriterion(
        'EXACT_OR_ANY',
        ['Yerden Isıtma'],
        'Yerden Isıtma',
      ),
    ).toBe(true);

    expect(
      matchesCriterion(
        'EXACT_OR_ANY',
        ['Yerden Isıtma'],
        'Kombi',
      ),
    ).toBe(false);
  });

  it('treats every selected criterion value as an OR alternative', () => {
    expect(matchesCriterion('MAXIMUM', ['5', '10'], '8')).toBe(true);
    expect(matchesCriterion('MINIMUM', ['100', '150'], '120')).toBe(true);
    expect(matchesCriterion('EXACT_OR_ANY', ['Güney', 'Doğu'], 'Doğu')).toBe(true);
  });

  it('falls back unknown fields to exact-or-any safely', () => {
    expect(
      getCriterionSemantic(
        'DAIRE',
        'unknownCriterion',
      ).operator,
    ).toBe('EXACT_OR_ANY');
  });
});
