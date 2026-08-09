import { expect, test, type Page } from '@playwright/test';

const TECHNICAL_ERROR_PATTERNS = [
  /application error/i,
  /internal server error/i,
  /forbidden resource/i,
  /cannot read properties of/i,
  /referenceerror/i,
  /typeerror:/i,
  /chunkloaderror/i,
];

async function expectHealthyBody(page: Page, context: string) {
  await expect(page.locator('body')).toBeVisible();

  const bodyText = await page.locator('body').innerText();

  expect(
    bodyText.trim().length,
    `${context} boş sayfa döndürdü`,
  ).toBeGreaterThan(0);

  for (const pattern of TECHNICAL_ERROR_PATTERNS) {
    expect(
      bodyText,
      `${context} teknik hata metni gösteriyor: ${pattern}`,
    ).not.toMatch(pattern);
  }
}

async function expectNoHorizontalOverflow(page: Page, context: string) {
  const layout = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  expect(
    layout.documentWidth,
    `${context} document yatay taşıyor: ${JSON.stringify(layout)}`,
  ).toBeLessThanOrEqual(layout.innerWidth + 1);

  expect(
    layout.bodyWidth,
    `${context} body yatay taşıyor: ${JSON.stringify(layout)}`,
  ).toBeLessThanOrEqual(layout.innerWidth + 1);
}

test.describe('EPH Cross Browser Acceptance', () => {
  test('Giriş ekranı tüm tarayıcı profillerinde sağlıklı', async ({ page }) => {
    const response = await page.goto('/giris', { waitUntil: 'domcontentloaded' });

    expect(response).not.toBeNull();
    expect(response?.status() ?? 599).toBeLessThan(500);

    await expect(
      page.getByRole('heading', { name: 'Hesabınıza giriş yapın' }),
    ).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'E-posta adresi' }),
    ).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Giriş Yap' })).toBeVisible();

    await expectHealthyBody(page, 'giriş ekranı');
    await expectNoHorizontalOverflow(page, 'giriş ekranı');
  });

  test('Oturumsuz kullanıcı dashboard yerine giriş ekranına gidiyor', async ({ page }) => {
    const response = await page.goto('/dashboard', {
      waitUntil: 'domcontentloaded',
    });

    expect(response).not.toBeNull();
    expect(response?.status() ?? 599).toBeLessThan(500);

    await expect(page).toHaveURL(/\/giris(?:\?|$)/);
    await expect(
      page.getByRole('heading', { name: 'Hesabınıza giriş yapın' }),
    ).toBeVisible();
    await expectHealthyBody(page, 'dashboard yetkisiz erişim');
  });

  test('Proje sunum bağlantısı public kalıyor', async ({ page }) => {
    const response = await page.goto('/proje-sunum/playwright-gecersiz-token', {
      waitUntil: 'domcontentloaded',
    });

    expect(response).not.toBeNull();
    expect(response?.status() ?? 599).toBeLessThan(500);
    expect(new URL(page.url()).pathname).not.toBe('/giris');

    await expectHealthyBody(page, 'proje sunum public route');
    await expectNoHorizontalOverflow(page, 'proje sunum public route');
  });

  test('Portföy paylaşım bağlantısı public kalıyor', async ({ page }) => {
    const response = await page.goto('/portfoy-paylasim/playwright-gecersiz-token', {
      waitUntil: 'domcontentloaded',
    });

    expect(response).not.toBeNull();
    expect(response?.status() ?? 599).toBeLessThan(500);
    expect(new URL(page.url()).pathname).not.toBe('/giris');

    await expectHealthyBody(page, 'portföy paylaşım public route');
    await expectNoHorizontalOverflow(page, 'portföy paylaşım public route');
  });

  test('Talep paylaşım bağlantısı public kalıyor', async ({ page }) => {
    const response = await page.goto('/talep-paylasim/playwright-gecersiz-token', {
      waitUntil: 'domcontentloaded',
    });

    expect(response).not.toBeNull();
    expect(response?.status() ?? 599).toBeLessThan(500);
    expect(new URL(page.url()).pathname).not.toBe('/giris');

    await expectHealthyBody(page, 'talep paylaşım public route');
    await expectNoHorizontalOverflow(page, 'talep paylaşım public route');
  });

  test('Şifre yenileme ekranı mobil ve masaüstünde taşmıyor', async ({ page }) => {
    const response = await page.goto('/sifremi-unuttum', {
      waitUntil: 'domcontentloaded',
    });

    expect(response).not.toBeNull();
    expect(response?.status() ?? 599).toBeLessThan(500);

    await expect(
      page.getByRole('heading', { name: 'Şifrenizi yenileyin' }),
    ).toBeVisible();
    await expectHealthyBody(page, 'şifre yenileme');
    await expectNoHorizontalOverflow(page, 'şifre yenileme');
  });
});
