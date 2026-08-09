import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';

import { loginWithStandaloneRequest } from './helpers/live-auth';

const email = process.env.EPH_TEST_MUTEAHHIT_EMAIL?.trim() || '';
const password = process.env.EPH_TEST_MUTEAHHIT_PASSWORD || '';
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
  '/proje-satis-sablonu',
];

const MOBILE_ROUTES = [
  '/dashboard',
  '/portfoy',
  '/crm',
  '/network',
  '/havuz',
  '/proje-satis-sablonu',
];

const HEALTHY_API_ROUTES = [
  '/api/crm/customers',
  '/api/crm/pipeline',
  '/api/pool-projects',
  '/api/coordination/lina-opportunities',
  '/api/kontor/cuzdan',
  '/api/kontor/hareketler',
  '/api/kontor/ozet',
  '/api/kontor/paket',
  '/api/project-sales/projects',
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

type AuthUser = {
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

type ApiAuthenticatedContext = {
  context: BrowserContext;
  token: string;
  user: AuthUser;
};

function isMuteahhitRole(role?: string) {
  const normalized = String(role || '').toLocaleUpperCase('tr-TR');
  return ['MUTEAHHIT', 'MÜTEAHHİT', 'MÜTAHHİT'].includes(normalized);
}

async function authenticateMuteahhit(): Promise<{
  token: string;
  user: AuthUser;
}> {
  const result = await loginWithStandaloneRequest<AuthUser>({
    baseURL,
    email,
    password,
    accountLabel: 'EPH Müteahhit test hesabı',
    attempts: 2,
    timeoutMs: 30_000,
    retryDelayMs: 1_500,
  });

  const payload = result.payload;

  if (!result.ok) {
    throw new Error(
      `EPH Müteahhit test hesabı doğrulanamadı (HTTP ${result.status}): ${
        payload.message || 'Giriş reddedildi.'
      }`,
    );
  }

  const token = String(payload.token || '');
  const user = payload.user;

  if (!token || !user?.id) {
    throw new Error(
      'EPH Müteahhit test hesabı için token veya kullanıcı bilgisi alınamadı.',
    );
  }

  if (!isMuteahhitRole(user.role)) {
    throw new Error(
      `EPH test hesabının rolü MUTEAHHIT değil: ${String(
        user.role || 'BILINMIYOR',
      )}`,
    );
  }

  return { token, user };
}

async function createApiAuthenticatedContext(
  browser: Browser,
): Promise<ApiAuthenticatedContext> {
  const { token, user } = await authenticateMuteahhit();
  const context = await browser.newContext();
  return { context, token, user };
}

async function createUiAuthenticatedContext(
  browser: Browser,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('/giris', {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  });
  await page.waitForLoadState('load');
  await page.waitForTimeout(800);

  await page
    .getByRole('textbox', { name: 'E-posta adresi' })
    .fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();

  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 20_000 });
  await page.waitForTimeout(1200);
  await expect(page.locator('body')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menü' })).toBeVisible();

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
      if (attempt === 1) await page.waitForTimeout(800);
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

async function inspectRoleMenu(page: Page) {
  await page.getByRole('button', { name: 'Menü' }).click();
  const closeButton = page.getByRole('button', { name: 'Menüyü kapat' });
  await expect(closeButton).toBeVisible({ timeout: 5000 });

  const drawer = page.locator('.eph-mobile-menu-drawer');
  await expect(drawer).toBeVisible();

  await expect(drawer.getByText('Müteahhit', { exact: true })).toBeVisible();
  await expect(
    drawer.getByText('Proje Satış Merkezi', { exact: true }),
  ).toBeVisible();
  await expect(drawer.getByText('Duyurular', { exact: true })).toHaveCount(0);
  await expect(
    drawer.getByText('Referans Kodları', { exact: true }),
  ).toHaveCount(0);

  for (const label of [
    'Anasayfa',
    'Portföy',
    'CRM',
    'Talep Merkezi',
    'Havuz',
    'Mesajlar',
    'Lina Asistan',
    'Lina Fırsatları',
    'Proje Satış Merkezi',
  ]) {
    await expect.soft(
      drawer.getByText(label, { exact: true }).first(),
      `Müteahhit menüsünde ${label} görünmüyor`,
    ).toBeVisible();
  }

  await closeButton.click();
}

test.describe('EPH Müteahhit Canlı Oturum', () => {
  test.skip(
    !email || !password,
    'EPH Müteahhit test hesabı GitHub Secrets içinde tanımlı değil.',
  );

  test('Müteahhit gerçek giriş, ana kullanıcı yolculuğu ve mobil görünüm', async ({
    browser,
  }) => {
    const { context, page } = await createUiAuthenticatedContext(browser);
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

    await inspectRoleMenu(page);

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

    await page.goto('/proje-satis-sablonu', {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForTimeout(900);

    await expect.soft(
      page.getByRole('heading', { name: 'EPH PROJE SATIŞ MERKEZİ' }),
      'Müteahhit Proje Satış Merkezi başlığını göremiyor.',
    ).toBeVisible();
    await expect.soft(
      page.getByRole('button', { name: /Yeni Proje Oluştur/i }),
      'Müteahhit Yeni Proje Oluştur butonunu göremiyor.',
    ).toBeVisible();
    await expect.soft(
      page.getByText('Bu Modüle Erişim Yetkiniz Yok', { exact: true }),
    ).toHaveCount(0);

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
    await page.waitForLoadState('load');

    const logoutMenuButton = page.getByRole('button', { name: 'Menü' });
    await expect(logoutMenuButton).toBeVisible();
    await logoutMenuButton.click();

    const logoutDrawer = page.locator('.eph-mobile-menu-drawer');
    await expect(logoutDrawer).toBeVisible();
    await logoutDrawer.getByText('Çıkış Yap', { exact: true }).click();
    await expect(page).toHaveURL(/\/giris(?:\?|$)/);

    await page.goto('/proje-satis-sablonu', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/giris(?:\?|$)/);

    await context.close();
  });

  test('Müteahhit temel API ve Proje Satış yetkileri sağlıklı', async ({
    browser,
  }) => {
    const { context, token, user } = await createApiAuthenticatedContext(browser);
    const authHeaders = { Authorization: `Bearer ${token}` };

    for (const path of HEALTHY_API_ROUTES) {
      const response = await context.request.get(`${baseURL}${path}`, {
        headers: authHeaders,
        timeout: 20_000,
      });

      expect.soft(
        response.status(),
        `${path} beklenmeyen HTTP ${response.status()} döndürdü`,
      ).toBeLessThan(500);
      expect.soft(
        response.status(),
        `${path} Müteahhit hesabını yetkisiz saydı`,
      ).not.toBe(401);
      expect.soft(
        response.status(),
        `${path} Müteahhit hesabını rol nedeniyle engelledi`,
      ).not.toBe(403);
    }

    const conversationsResponse = await context.request.get(
      `${baseURL}/api/conversations?userId=${encodeURIComponent(
        String(user.id || ''),
      )}`,
      {
        headers: authHeaders,
        timeout: 20_000,
      },
    );
    expect.soft(conversationsResponse.status()).toBeLessThan(500);
    expect.soft(conversationsResponse.status()).not.toBe(401);
    expect.soft(conversationsResponse.status()).not.toBe(403);

    const projectResponse = await context.request.get(
      `${baseURL}/api/project-sales/projects`,
      {
        headers: authHeaders,
        timeout: 20_000,
      },
    );
    expect(projectResponse.status()).toBe(200);

    const projects = await projectResponse.json();
    expect(
      Array.isArray(projects),
      'Proje Satış Merkezi proje listesi dizi dönmeli.',
    ).toBeTruthy();

    await context.close();
  });
});
