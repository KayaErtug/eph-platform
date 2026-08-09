import { expect, test } from '@playwright/test';

const email = process.env.EPH_TEST_EMLAKCI_EMAIL?.trim() || '';
const password = process.env.EPH_TEST_EMLAKCI_PASSWORD || '';

test.describe('EPH Emlakçı 3D Yetki Regresyonu', () => {
  test.skip(
    !email || !password,
    'EPH Emlakçı test hesabı GitHub Secrets içinde tanımlı değil.',
  );

  test('Emlakçı 3D Stüdyo yerine kullanıcı dostu uyarı ve Havuza Dön görür', async ({
    page,
  }) => {
    await page.goto('/giris', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(800);

    await page
      .getByRole('textbox', { name: 'E-posta adresi' })
      .fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Giriş Yap' }).click();

    await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 20_000 });

    await page.goto(
      '/proje-satis-sablonu/3d/playwright-yetki-kontrolu',
      {
        waitUntil: 'domcontentloaded',
        timeout: 25_000,
      },
    );

    await expect(
      page.getByText('3D Stüdyo Erişimi Kısıtlı', { exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.locator('body')).not.toContainText('Forbidden resource');
    await expect(page.locator('body')).not.toContainText('Forbidden');

    const backButton = page.getByRole('button', { name: 'Havuza Dön' });
    await expect(backButton).toBeVisible();
    await backButton.click();

    await expect(page).toHaveURL(/\/havuz(?:\?|$)/);
  });
});
