import { TextSafetyService } from './text-safety.service';

describe('TextSafetyService', () => {
  let service: TextSafetyService;

  beforeEach(() => {
    service = new TextSafetyService();
  });

  it('allows a normal real-estate title', () => {
    const result = service.validatePublicTitle(
      'Merkezefendi 3+1 villa arıyorum',
    );

    expect(result.valid).toBe(true);
  });

  it('blocks a direct mobile number', () => {
    const result = service.validatePublicTitle(
      'Villa için 0532 505 16 41 arayın',
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(
      'PHONE_NUMBER_DETECTED',
    );
  });

  it('blocks a Turkish phone number written with words', () => {
    const result = service.validatePublicTitle(
      'beş yüz otuz iki beş yüz beş on altı kırk bir',
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(
      'PHONE_NUMBER_DETECTED',
    );
  });

  it('blocks a mixed numeric and written phone number', () => {
    const result = service.validatePublicTitle(
      '532 beş yüz beş 16 kırk bir',
    );

    expect(result.valid).toBe(false);
  });

  it('does not treat property measurements as a phone', () => {
    const result = service.validatePublicTitle(
      'Beş yüz metrekare dört odalı villa arıyorum',
    );

    expect(result.valid).toBe(true);
  });

  it('blocks a direct email address', () => {
    const result = service.validatePublicTitle(
      'mustafa@example.com adresine yazın',
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(
      'EMAIL_ADDRESS_DETECTED',
    );
  });

  it('blocks an obfuscated email address', () => {
    const result = service.validatePublicTitle(
      'mustafa et gmail nokta com',
    );

    expect(result.valid).toBe(false);
  });

  it('blocks a phone number in public description', () => {
    const result =
      service.validatePublicDescription(
        'Villa için 0532 505 16 41 arayın',
      );

    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(
      'PHONE_NUMBER_DETECTED',
    );
  });

  it('blocks a written phone number in public description', () => {
    const result =
      service.validatePublicDescription(
        'beş yüz otuz iki beş yüz beş on altı kırk bir',
      );

    expect(result.valid).toBe(false);
  });

  it('blocks an email in public description', () => {
    const result =
      service.validatePublicDescription(
        'mustafa et gmail nokta com adresine yazın',
      );

    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(
      'EMAIL_ADDRESS_DETECTED',
    );
  });

  it('blocks a protocol link in public title', () => {
    const result = service.validatePublicTitle(
      'Detaylar https://example.com adresinde',
    );

    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (issue) =>
          issue.code === 'PUBLIC_LINK_DETECTED',
      ),
    ).toBe(true);
  });

  it('blocks a bare domain in public title', () => {
    const result = service.validatePublicTitle(
      'Detaylar example.com adresinde',
    );

    expect(result.valid).toBe(false);
  });

  it('blocks a www link in public description', () => {
    const result =
      service.validatePublicDescription(
        'Detay için www.example.com adresine bakın',
      );

    expect(result.valid).toBe(false);
  });

  it('blocks an obfuscated domain in public description', () => {
    const result =
      service.validatePublicDescription(
        'Detaylar example nokta com adresinde',
      );

    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (issue) =>
          issue.code === 'PUBLIC_LINK_DETECTED',
      ),
    ).toBe(true);
  });

  it('blocks profanity in public text', () => {
    const result =
      service.validatePublicDescription(
        'Bu uygunsuz metinde siktir ifadesi var.',
      );

    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe(
      'PROFANITY_DETECTED',
    );
  });

  it('blocks obfuscated profanity', () => {
    const result = service.validatePublicTitle(
      's * k t i r',
    );

    expect(result.valid).toBe(false);
  });

  it('warns when terminal commands are pasted', () => {
    const result =
      service.validatePublicDescription(
        'cd /var/www/eph && pm2 restart eph-frontend',
      );

    expect(result.valid).toBe(true);
    expect(result.warnings.some(
      (issue) =>
        issue.code ===
        'TECHNICAL_PASTE_DETECTED',
    )).toBe(true);
  });
});
