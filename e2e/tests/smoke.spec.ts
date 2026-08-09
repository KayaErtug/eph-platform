import { expect, test, type Page } from '@playwright/test';

const TECHNICAL_ERROR_PATTERNS = [
  /application error/i,
  /internal server error/i,
  /forbidden resource/i,
  /cannot read properties of/i,
  /referenceerror/i,
  /typeerror:/i,
  /undefined is not/i,
  /unexpected token/i,
  /chunkloaderror/i,
];

const PUBLIC_ROUTES = [
  '/giris',
  '/kayit',
  '/sifremi-unuttum',
  '/kvkk',
  '/kullanici-sozlesmesi',
  '/gizlilik-politikasi',
  '/cerez-politikasi',
];

const PROTECTED_ROUTES = [
  '/dashboard',
  '/portfoy',
  '/havuz',
  '/profil',
  '/crm',
  '/network',
  '/messages',
  '/kontor',
  '/uyelik',
  '/lina',
  '/lina-firsatlari',
  '/notification-settings',
  '/admin',
  '/market',
  '/stok',
  '/uretkenlik',
  '/forum-v3',
  '/help-center',
  '/proje-satis-sablonu',
];

async function expectNoTechnicalErrorText(page: Page, context: string) {
  const bodyText = await page.locator('body').innerText();

  expect(
    bodyText.trim().length,
    `${context} boş sayfa döndürdü`,
  ).toBeGreaterThan(0);

  for (const pattern of TECHNICAL_ERROR_PATTERNS) {
    expect(
      bodyText,
      `${context} kullanıcıya teknik hata metni gösteriyor: ${pattern}`,
    ).not.toMatch(pattern);
  }
}

async function expectHealthyPage(page: Page, path: string) {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const response = await page.goto(path, {
    waitUntil: 'domcontentloaded',
  });

  expect(response, `${path} için document response alınamadı`).not.toBeNull();
  expect(
    response?.status() ?? 599,
    `${path} HTTP ${response?.status()} döndürdü`,
  ).toBeLessThan(500);

  await expect(page.locator('body')).toBeVisible();
  await expectNoTechnicalErrorText(page, path);

  expect(
    pageErrors,
    `${path} tarayıcı runtime hatası üretti: ${pageErrors.join(' | ')}`,
  ).toEqual([]);
}

async function openHydratedLogin(page: Page) {
  await page.goto('/giris', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');
  await page.waitForTimeout(1200);
  await expect(page.getByRole('button', { name: 'Giriş Yap' })).toBeEnabled();
}

test.describe('EPH P0 Smoke', () => {
  for (const path of PUBLIC_ROUTES) {
    test(`Halka açık sayfa sağlıklı açılıyor: ${path}`, async ({ page }) => {
      await expectHealthyPage(page, path);
      await expect(page).toHaveURL(new RegExp(`${path.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?:\\?|$)`));
    });
  }

  test('Giriş ekranının temel kontrolleri görünür', async ({ page }) => {
    await expectHealthyPage(page, '/giris');
    await expect(
      page.getByRole('heading', { name: 'Hesabınıza giriş yapın' }),
    ).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'E-posta adresi' }),
    ).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Giriş Yap' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Şifremi unuttum' })).toBeVisible();
  });

  test('Giriş formu kısa şifreyi kullanıcıya bildiriyor', async ({ page }) => {
    await openHydratedLogin(page);
    await page
      .getByRole('textbox', { name: 'E-posta adresi' })
      .fill('playwright-validation@example.com');
    await page.locator('#password').fill('123');
    await page.getByRole('button', { name: 'Giriş Yap' }).click();

    await expect(page.locator('.login-error')).toContainText(
      'Şifre en az 6 karakter olmalıdır',
    );
    await expect(page).toHaveURL(/\/giris(?:\?|$)/);
    await expectNoTechnicalErrorText(page, 'hatalı giriş formu');
  });

  test('Geçersiz giriş kullanıcı dostu hata gösteriyor', async ({ page }) => {
    await page.route(/\/auth\/login(?:\?|$)/, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'E-posta veya şifre hatalı.' }),
      });
    });

    await openHydratedLogin(page);
    await page
      .getByRole('textbox', { name: 'E-posta adresi' })
      .fill('playwright-test@example.com');
    await page.locator('#password').fill('YanlisSifre123!');

    const loginRequest = page.waitForRequest((request) =>
      /\/auth\/login(?:\?|$)/.test(request.url()),
    );

    await page.getByRole('button', { name: 'Giriş Yap' }).click();
    await loginRequest;

    await expect(page.locator('.login-server-error')).toContainText(
      'E-posta veya şifre hatalı.',
    );
    await expect(page).toHaveURL(/\/giris(?:\?|$)/);
    await expectNoTechnicalErrorText(page, 'geçersiz giriş');
  });

  test('Girişten kayıt sayfasına geçiş çalışıyor', async ({ page }) => {
    await page.goto('/giris', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Kayıt talebi oluşturun' }).click();
    await expect(page).toHaveURL(/\/kayit(?:\?|$)/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Girişten şifre yenileme sayfasına geçiş çalışıyor', async ({ page }) => {
    await page.goto('/giris', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Şifremi unuttum' }).click();
    await expect(page).toHaveURL(/\/sifremi-unuttum(?:\?|$)/);
    await expect(
      page.getByRole('heading', { name: 'Şifrenizi yenileyin' }),
    ).toBeVisible();
  });

  for (const path of PROTECTED_ROUTES) {
    test(`Oturumsuz kullanıcı korumalı route'a giremiyor: ${path}`, async ({ page }) => {
      const response = await page.goto(path, {
        waitUntil: 'domcontentloaded',
      });

      expect(response, `${path} için response alınamadı`).not.toBeNull();
      expect(response?.status() ?? 599).toBeLessThan(500);
      await expect(page).toHaveURL(/\/giris(?:\?|$)/);
      await expect(
        page.getByRole('heading', { name: 'Hesabınıza giriş yapın' }),
      ).toBeVisible();
      await expectNoTechnicalErrorText(page, `${path} yetkisiz erişim`);
    });
  }

  test('iPhone boyutunda giriş ekranında yatay taşma yok', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 736 });
    await page.goto('/giris', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('button', { name: 'Giriş Yap' })).toBeVisible();

    const layout = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));

    expect(
      layout.scrollWidth,
      `Mobil document taşması: ${JSON.stringify(layout)}`,
    ).toBeLessThanOrEqual(layout.innerWidth + 1);
    expect(
      layout.bodyScrollWidth,
      `Mobil body taşması: ${JSON.stringify(layout)}`,
    ).toBeLessThanOrEqual(layout.innerWidth + 1);

    await expectNoTechnicalErrorText(page, 'iPhone giriş görünümü');
  });

  test('iPhone boyutunda şifre yenileme ekranında yatay taşma yok', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/sifremi-unuttum', { waitUntil: 'domcontentloaded' });

    const layout = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));

    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
    expect(layout.bodyScrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
    await expectNoTechnicalErrorText(page, 'iPhone şifre yenileme görünümü');
  });
});
