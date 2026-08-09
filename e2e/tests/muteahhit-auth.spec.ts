import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';

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

type AuthPayload = {
  token?: string;
  user?: AuthUser;
  message?: string;
};

type AuthenticatedContext = {
  context: BrowserContext;
  page: Page;
  token: string;
  user: AuthUser;
};

function isMuteahhitRole(role?: string) {
  const normalized = String(role || '').toLocaleUpperCase('tr-TR');
  return ['MUTEAHHIT', 'MÜTEAHHİT', 'MÜTAHHİT'].includes(normalized);
}

async function authenticateMuteahhit(
  request: APIRequestContext,
): Promise<{ token: string; user: AuthUser }> {
  const response = await request.post(`${baseURL}/api/auth/login`, {
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
      `EPH Müteahhit test hesabı doğrulanamadı (HTTP ${response.status()}): ${
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

async function createAuthenticatedMuteahhitContext(
  browser: Browser,
): Promise<AuthenticatedContext> {
  const context = await browser.newContext();
  const { token, user } = await authenticateMuteahhit(context.request);

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

  return { context, page, token, user };
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

async function inspectRoleMenu(page: Page) {
  const menuButton = page.getByRole('button', { name: 'Menü' });
  await expect(menuButton).toBeVisible();
  await menuButton.click();

  const closeButton = page.getByRole('button', { name: 'Menüyü kapat' });
  const menuOpened = await closeButton
    .isVisible({ timeout: 2500 })
    .catch(() => false);

  expect.soft(
    menuOpened,
    'Müteahhit Dashboard hamburger menüsü drawer açmadı.',
  ).toBeTruthy();

  if (!menuOpened) {
    return;
  }

  await expect.soft(
    page.getByText('Müteahhit', { exact: true }),
    'Açılan menüde Müteahhit rol etiketi görünmüyor.',
  ).toBeVisible();
  await expect.soft(
    page.getByText('Proje Satış Merkezi', { exact: true }),
    'Müteahhit menüsünde Proje Satış Merkezi görünmüyor.',
  ).toBeVisible();
  await expect.soft(
    page.getByText('Duyurular', { exact: true }),
    'Müteahhit menüsünde Admin Duyurular bağlantısı görünmemeli.',
  ).toHaveCount(0);
  await expect.soft(
    page.getByText('Referans Kodları', { exact: true }),
    'Müteahhit menüsünde Admin Referans Kodları bağlantısı görünmemeli.',
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
      page.getByText(label, { exact: true }).first(),
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

  test('Müteahhit ana kullanıcı yolculuğu, Proje Satış Merkezi ve mobil görünüm', async ({
    browser,
  }) => {
    const { context, page } = await createAuthenticatedMuteahhitContext(browser);
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

    const menuButton = page.getByRole('button', { name: 'Menü' });
    await menuButton.click();
    const logoutButton = page.getByText('Çıkış Yap', { exact: true });
    const logoutVisible = await logoutButton
      .isVisible({ timeout: 2500 })
      .catch(() => false);

    if (logoutVisible) {
      await logoutButton.click();
      await expect(page).toHaveURL(/\/giris(?:\?|$)/);
      await page.goto('/proje-satis-sablonu', {
        waitUntil: 'domcontentloaded',
      });
      await expect(page).toHaveURL(/\/giris(?:\?|$)/);
    } else {
      expect.soft(
        false,
        'Müteahhit hamburger menüsü çıkış kontrolünde de açılmadı.',
      ).toBeTruthy();
    }

    await context.close();
  });

  test('Müteahhit temel API ve Proje Satış yetkileri sağlıklı', async ({
    browser,
  }) => {
    const { context, token, user } =
      await createAuthenticatedMuteahhitContext(browser);
    const authHeaders = {
      Authorization: `Bearer ${token}`,
    };

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
