import { HttpException } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactMailMessage, ContactService } from './contact.service';

const valid = {
  adSoyad: 'Ayşe Yılmaz',
  eposta: 'ayse@example.com',
  telefon: '5321234567',
  ofisDurumu: 'VAR',
  website: '',
};

const SMTP_KEYS = [
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'CONTACT_TO',
];

function setup(ip = '1.1.1.1') {
  const sent: ContactMailMessage[] = [];
  const service = new ContactService(async (m) => {
    sent.push(m);
  });
  const controller = new ContactController(service);
  const req = { headers: { 'x-forwarded-for': ip } };
  return { sent, controller, req };
}

async function status(p: Promise<unknown>) {
  try {
    await p;
    return 200;
  } catch (e) {
    return (e as HttpException).getStatus();
  }
}

describe('POST /public/contact', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    SMTP_KEYS.forEach((k) => (saved[k] = process.env[k]));
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_USER = 'u@test';
    process.env.SMTP_PASS = 'x';
    delete process.env.SMTP_FROM;
    delete process.env.CONTACT_TO;
  });
  afterEach(() => {
    SMTP_KEYS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  it('geçerli istek: e-posta gönderilir (konu, reply-to, varsayılan alıcı)', async () => {
    const { controller, req, sent } = setup();
    await expect(controller.contact({ ...valid }, req)).resolves.toEqual({
      ok: true,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe('Form Dolduran');
    expect(sent[0].to).toBe('info@emlakportfoyhavuzu.com');
    expect(sent[0].replyTo).toBe('ayse@example.com');
    expect(sent[0].text).toContain('Ayşe Yılmaz');
    expect(sent[0].text).toContain('5321234567');
    expect(sent[0].text).toContain('Europe/Istanbul');
  });

  it('CONTACT_TO ortam değişkeni alıcıyı belirler', async () => {
    process.env.CONTACT_TO = 'baska@example.com';
    const { controller, req, sent } = setup();
    await controller.contact({ ...valid }, req);
    expect(sent[0].to).toBe('baska@example.com');
  });

  it('eksik/geçersiz alan: 400, e-posta yok', async () => {
    const { controller, sent } = setup();
    let n = 0;
    for (const bad of [
      { ...valid, adSoyad: 'A' },
      { ...valid, eposta: 'gecersiz' },
      { ...valid, telefon: '4321234567' },
      { ...valid, telefon: '532123456' },
      { ...valid, ofisDurumu: 'BELKI' },
      { eposta: valid.eposta },
    ]) {
      const r = { headers: { 'x-forwarded-for': `7.7.7.${n++}` } };
      expect(await status(controller.contact(bad, r))).toBe(400);
    }
    expect(sent).toHaveLength(0);
  });

  it('bot tuzağı dolu: 200 döner ama e-posta gönderilmez', async () => {
    const { controller, req, sent } = setup();
    await expect(
      controller.contact({ ...valid, website: 'http://spam' }, req),
    ).resolves.toEqual({ ok: true });
    expect(sent).toHaveLength(0);
  });

  it('SMTP ayarı yok: 503 CONTACT_UNAVAILABLE', async () => {
    delete process.env.SMTP_HOST;
    const { controller, req, sent } = setup();
    try {
      await controller.contact({ ...valid }, req);
      throw new Error('beklenen hata yok');
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(503);
      expect((e as HttpException).getResponse()).toEqual({
        error: 'CONTACT_UNAVAILABLE',
      });
    }
    expect(sent).toHaveLength(0);
  });

  it('gönderici hata verirse 503', async () => {
    const service = new ContactService(async () => {
      throw new Error('smtp down');
    });
    const controller = new ContactController(service);
    expect(
      await status(
        controller.contact({ ...valid }, { headers: { 'x-forwarded-for': '9.9.9.9' } }),
      ),
    ).toBe(503);
  });

  it('hız sınırı: aynı IP saatte 5 istek, 6. istek 429; başka IP etkilenmez', async () => {
    const { controller, req, sent } = setup('2.2.2.2');
    for (let i = 0; i < 5; i++) {
      await controller.contact({ ...valid }, req);
    }
    expect(await status(controller.contact({ ...valid }, req))).toBe(429);
    expect(sent).toHaveLength(5);
    await expect(
      controller.contact({ ...valid }, { headers: { 'x-forwarded-for': '3.3.3.3' } }),
    ).resolves.toEqual({ ok: true });
  });

  it('gövde boyutu sınırı: büyük gövde 413', async () => {
    const { controller, req, sent } = setup('4.4.4.4');
    const big = { ...valid, adSoyad: 'x'.repeat(5000) };
    expect(await status(controller.contact(big, req))).toBe(413);
    expect(sent).toHaveLength(0);
  });
});
