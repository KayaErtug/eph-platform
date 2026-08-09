import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

const email = process.env.EPH_TEST_EMLAKCI_EMAIL?.trim() || '';
const password = process.env.EPH_TEST_EMLAKCI_PASSWORD || '';
const baseURL =
  process.env.EPH_BASE_URL?.trim().replace(/\/$/, '') ||
  'https://emlakportfoyhavuzu.com';

const CORE_ROUTES = [
  '/dashboard',
  '/portfoy',
  '/havuz',
  '/network',
  '/crm',
  '/lina-firsatlari',
  '/messages',
  '/kontor',
  '/uyelik',
  '/profil',
  '/notification-settings',
  '/uretkenlik',
  '/help-center',
];

const MOBILE_ROUTES = [
  '/dashboard',
  '/portfoy',
  '/crm',
  '/network',
  '/havuz',
];

const TECHNICAL_ERROR_PATTERNS = [
  /application error/i,
  /internal server error/i,
  /forbidden resource/i,
  /cannot read properties of/i,
  /referenceerror/i,
  /typeerror:/i,
  /chunkloaderror/i,
];

type AuthPayload = {
  token?: string;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    capabilities?: string[];
    isApproved?: boolean;
    referralCode?: string | null;
    nominationPoints?: number;
    nominationQuota?: number;
  };
  message?: string;
};

async function createAuthenticatedEmlakciContext(
  browser: Browser,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();

  const response = await context.request.post(`${baseURL}/api/auth/login`, {
    data: {
      email,
      password,
    },
    timeout: 20_000,
  });

  let payload: AuthPayload = {};
  try {
    payload = (await response.json()) as AuthPayload;
  } catch {
    payload = {};
  }

  if (!response.ok()) {
    throw new Error(
      `EPH Emlakçı test hesabı doğrulanamadı (HTTP ${response.status()}): ${
        payload.message || 'Giriş reddedildi.'
      }`,
    );
  }

  const token = String(payload.token || '');
  const user = payload.user;

  if (!token || !user?.id) {
    throw new Error('EPH Emlakçı test hesabı için token veya kullanıcı bilgisi alınamadı.');
  }

  if (user.role !== 'EMLAKCI') {
    throw new Error(
      `EPH test hesabının rolü EMLAKCI değil: ${String(user.role || 'BILINMIYOR')}`,
    );
  }

  await context.addCookies([
    {
      name: 'eph_token',
      value: token,
      url: baseURL,
      sameSite: 'Lax',
    },
  ]);

  await context.addInitScript(
    ({ storedUser, storedToken }) => {
      window.localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user: storedUser,
            token: storedToken,
          },
          version: 0,
        }),
      );
    },
    {
      storedUser: user,
      storedToken: token,
    },
  );

  const page = await context.newPage();
  await page.goto('/dashboard', {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  });
  await page.waitForTimeout(900);

  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  await expect(page.locator('body')).toBeVisible();

  return { context, page };
}

async function visitWithRetry(page: Page, path: string) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      });
      await page.waitForTimeout(700);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        await page.waitForTimeout(800);
      }
    }
  }

  throw lastError;
}

async function expectNoTechnicalText(page: Page, path: string) {
  const bodyText = await page.locator('body').innerText();
  expect.soft(bodyText.trim().length, `${path} boş ekran`).toBeGreaterThan(0);

  for (const pattern of TECHNICAL_ERROR_PATTERNS) {
    expect.soft(
      bodyText,
      `${path} kullanıcıya teknik hata gösteriyor: ${pattern}`,
    ).not.toMatch(pattern);
  }
}

test.describe('EPH Emlakçı Canlı Oturum', () => {
  test.skip(!email || !password, 'EPH Emlakçı test hesabı GitHub Secrets içinde tanımlı değil.');

  test('Emlakçı ana kullanıcı yolculuğu, rol menüsü, API sağlığı ve mobil görünüm', async ({ browser }) => {
    const { context, page } = await createAuthenticatedEmlakciContext(browser);
    const pageErrors: string[] = [];
    const serverErrors: string[] = [];

    page.on('pageerror', (error) => {
      pageErrors.push(`${page.url()} :: ${error.message}`);
    });

    page.on('response', (response) => {
      const url = response.url();
      if (url.startsWith(`${baseURL}/api/`) && response.status() >= 500) {
        serverErrors.push(`${response.status()} ${url}`);
      }
    });

    await page.getByRole('button', { name: 'Menü' }).click();
    await expect(page.getByText('Emlakçı', { exact: true })).toBeVisible();
    await expect(page.getByText('Proje Satış Merkezi', { exact: true })).toHaveCount(0);

    for (const label of [
      'Anasayfa',
      'Portföy',
      'CRM',
      'Talep Merkezi',
      'Havuz',
      'Mesajlar',
      'Lina Asistan',
      'Lina Fırsatları',
    ]) {
      await expect.soft(
        page.getByText(label, { exact: true }).first(),
        `Emlakçı menüsünde ${label} görünmüyor`,
      ).toBeVisible();
    }

    await page.getByRole('button', { name: 'Menüyü kapat' }).click();

    for (const path of CORE_ROUTES) {
      try {
        const response = await visitWithRetry(page, path);
        expect.soft(
          response?.status() ?? 599,
          `${path} HTTP ${response?.status()} döndürdü`,
        ).toBeLessThan(500);
        expect.soft(
          new URL(page.url()).pathname,
          `${path} oturum kaybıyla giriş sayfasına döndü`,
        ).not.toBe('/giris');
        await expect.soft(page.locator('body')).toBeVisible();
        await expectNoTechnicalText(page, path);
      } catch (error) {
        expect.soft(false, `${path} açılamadı: ${String(error)}`).toBeTruthy();
      }
    }

    await page.setViewportSize({ width: 414, height: 736 });

    for (const path of MOBILE_ROUTES) {
      try {
        await visitWithRetry(page, path);
        const layout = await page.evaluate(() => ({
          innerWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
        }));

        expect.soft(
          layout.documentWidth,
          `${path} mobil document yatay taşıyor: ${JSON.stringify(layout)}`,
        ).toBeLessThanOrEqual(layout.innerWidth + 1);
        expect.soft(
          layout.bodyWidth,
          `${path} mobil body yatay taşıyor: ${JSON.stringify(layout)}`,
        ).toBeLessThanOrEqual(layout.innerWidth + 1);
      } catch (error) {
        expect.soft(false, `${path} mobil test açılamadı: ${String(error)}`).toBeTruthy();
      }
    }

    expect.soft(
      serverErrors,
      `Canlı API 5xx hataları: ${serverErrors.join(' | ')}`,
    ).toEqual([]);

    expect.soft(
      pageErrors,
      `Tarayıcı runtime hataları: ${pageErrors.join(' | ')}`,
    ).toEqual([]);

    await page.setViewportSize({ width: 1280, height: 900 });
    await visitWithRetry(page, '/dashboard');
    await page.getByRole('button', { name: 'Menü' }).click();
    await page.getByText('Çıkış Yap', { exact: true }).click();
    await expect(page).toHaveURL(/\/giris(?:\?|$)/);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/giris(?:\?|$)/);

    await context.close();
  });
});
