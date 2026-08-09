import { expect, test } from '@playwright/test';

const baseURL =
  process.env.EPH_BASE_URL?.trim().replace(/\/$/, '') ||
  'https://emlakportfoyhavuzu.com';

test.describe('EPH PWA Üretim Kabul', () => {
  test('Manifest geçerli ve zorunlu PWA varlıkları erişilebilir', async ({ request }) => {
    const manifestResponse = await request.get(`${baseURL}/manifest.json`, {
      timeout: 20_000,
    });

    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()['content-type'] || '').toMatch(/json/i);

    const manifest = (await manifestResponse.json()) as {
      name?: string;
      short_name?: string;
      start_url?: string;
      scope?: string;
      display?: string;
      lang?: string;
      icons?: Array<{ src?: string; sizes?: string }>;
    };

    expect(manifest.name).toContain('EPH');
    expect(manifest.short_name).toBe('EPH');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.lang).toBe('tr');

    const iconPaths = [
      '/favicon-96x96.png',
      '/apple-touch-icon.png',
      '/web-app-manifest-192x192.png',
      '/web-app-manifest-512x512.png',
    ];

    for (const path of iconPaths) {
      const response = await request.get(`${baseURL}${path}`, {
        timeout: 20_000,
      });

      expect(response.status(), `${path} erişilemiyor`).toBe(200);
      expect(
        response.headers()['content-type'] || '',
        `${path} PNG dönmüyor`,
      ).toMatch(/image\/png/i);
      expect((await response.body()).byteLength, `${path} boş`).toBeGreaterThan(500);
    }
  });

  test('Service worker dosyaları üretimde sağlıklı sunuluyor', async ({ request }) => {
    for (const path of ['/sw.js', '/push-sw.js']) {
      const response = await request.get(`${baseURL}${path}`, {
        timeout: 20_000,
      });

      expect(response.status(), `${path} erişilemiyor`).toBe(200);
      expect(
        response.headers()['content-type'] || '',
        `${path} JavaScript dönmüyor`,
      ).toMatch(/javascript|text\/plain/i);

      const body = await response.text();
      expect(body.trim().length, `${path} boş`).toBeGreaterThan(100);
    }
  });

  test('Sayfa PWA metadata ve viewport-fit cover içeriyor', async ({ page }) => {
    await page.goto('/giris', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/manifest.json',
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      '/apple-touch-icon.png',
    );

    const viewport = await page
      .locator('meta[name="viewport"]')
      .getAttribute('content');
    expect(viewport || '').toContain('viewport-fit=cover');

    await expect(
      page.locator('meta[name="apple-mobile-web-app-capable"]'),
    ).toHaveAttribute('content', 'yes');
  });

  test('Ana PWA service worker /sw.js olarak aktif kalıyor', async ({ page }) => {
    await page.goto('/giris', {
      waitUntil: 'load',
      timeout: 30_000,
    });

    const serviceWorkerSupported = await page.evaluate(
      () => 'serviceWorker' in navigator,
    );
    expect(serviceWorkerSupported).toBeTruthy();

    await page.waitForTimeout(2500);

    const registrations = await page.evaluate(async () => {
      const items = await navigator.serviceWorker.getRegistrations();

      return items.map((registration) => ({
        scope: registration.scope,
        active: registration.active?.scriptURL || '',
        waiting: registration.waiting?.scriptURL || '',
        installing: registration.installing?.scriptURL || '',
      }));
    });

    expect(registrations.length, 'Hiç service worker kaydı yok').toBeGreaterThan(0);

    const rootRegistration = registrations.find((registration) => {
      try {
        return new URL(registration.scope).pathname === '/';
      } catch {
        return false;
      }
    });

    expect(rootRegistration, 'Kök scope service worker kaydı yok').toBeTruthy();

    const currentScript =
      rootRegistration?.active ||
      rootRegistration?.waiting ||
      rootRegistration?.installing ||
      '';

    expect(currentScript, 'Kök scope worker scripti belirlenemedi').not.toBe('');
    expect(
      new URL(currentScript).pathname,
      `Kök PWA worker beklenmedik script ile çalışıyor: ${currentScript}`,
    ).toBe('/sw.js');
  });
});
