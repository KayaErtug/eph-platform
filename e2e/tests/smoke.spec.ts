import { expect, test, type Page } from '@playwright/test';

const TECHNICAL_ERROR_PATTERNS = [
  /application error/i,
  /internal server error/i,
  /forbidden resource/i,
  /cannot read properties of/i,
  /referenceerror/i,
  /typeerror:/i,
  /undefined is not/i,
];

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

  const bodyText = await page.locator('body').innerText();
  expect(bodyText.trim().length, `${path} boş sayfa döndürdü`).toBeGreaterThan(0);

  for (const pattern of TECHNICAL_ERROR_PATTERNS) {
    expect(
      bodyText,
      `${path} kullanıcıya teknik hata metni gösteriyor: ${pattern}`,
    ).not.toMatch(pattern);
  }

  expect(
    pageErrors,
    `${path} tarayıcı runtime hatası üretti: ${pageErrors.join(' | ')}`,
  ).toEqual([]);
}

test.describe('EPH P0 Smoke', () => {
  test('Giriş sayfası sağlıklı açılıyor', async ({ page }) => {
    await expectHealthyPage(page, '/giris');
  });

  test('Kayıt sayfası sağlıklı açılıyor', async ({ page }) => {
    await expectHealthyPage(page, '/kayit');
  });

  test('Oturumsuz kullanıcı Dashboard yerine girişe yönleniyor', async ({ page }) => {
    const response = await page.goto('/dashboard', {
      waitUntil: 'domcontentloaded',
    });

    expect(response).not.toBeNull();
    expect(response?.status() ?? 599).toBeLessThan(500);
    await expect(page).toHaveURL(/\/giris(?:\?|$)/);
  });

  test('Oturumsuz kullanıcı Havuz yerine girişe yönleniyor', async ({ page }) => {
    const response = await page.goto('/havuz', {
      waitUntil: 'domcontentloaded',
    });

    expect(response).not.toBeNull();
    expect(response?.status() ?? 599).toBeLessThan(500);
    await expect(page).toHaveURL(/\/giris(?:\?|$)/);
  });
});
