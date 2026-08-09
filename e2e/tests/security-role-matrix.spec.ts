import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';

const baseURL =
  process.env.EPH_BASE_URL?.trim().replace(/\/$/, '') ||
  'https://emlakportfoyhavuzu.com';

const accounts = [
  {
    label: 'Emlakçı',
    expectedRole: 'EMLAKCI',
    email: process.env.EPH_TEST_EMLAKCI_EMAIL?.trim() || '',
    password: process.env.EPH_TEST_EMLAKCI_PASSWORD || '',
  },
  {
    label: 'Müteahhit',
    expectedRole: 'MUTEAHHIT',
    email: process.env.EPH_TEST_MUTEAHHIT_EMAIL?.trim() || '',
    password: process.env.EPH_TEST_MUTEAHHIT_PASSWORD || '',
  },
] as const;

const ADMIN_API_ROUTES = [
  '/api/admin/stats',
  '/api/admin/dashboard-summary',
  '/api/admin/users',
  '/api/admin/applications?status=all',
  '/api/admin/documents?filter=all',
  '/api/visits',
];

const ADMIN_UI_ROUTES = [
  '/admin',
  '/admin/users',
  '/admin/audit-log',
  '/admin/settings',
  '/admin/portfolio-approvals',
];

const POOL_FORBIDDEN_OWNER_KEYS = new Set([
  'ownername',
  'ownerfirstname',
  'ownerlastname',
  'ownerphone',
  'owneremail',
  'ownertckimlikno',
  'ownertckn',
  'tapusahibi',
  'tapuowner',
  'tapuownername',
  'tapuownertc',
  'tapuownertckimlikno',
  'taxnumber',
  'vkn',
  'yetkibelgesi',
  'authorizationdocument',
]);

type AuthUser = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

type AuthPayload = {
  token?: string;
  user?: AuthUser;
  message?: string;
};

function normalizeRole(role?: string) {
  return String(role || '').toLocaleUpperCase('tr-TR');
}

function roleMatches(actual: string, expected: 'EMLAKCI' | 'MUTEAHHIT') {
  const normalized = normalizeRole(actual);

  if (expected === 'EMLAKCI') return normalized === 'EMLAKCI';

  return ['MUTEAHHIT', 'MÜTEAHHİT', 'MÜTAHHİT'].includes(normalized);
}

async function authenticate(
  request: APIRequestContext,
  account: (typeof accounts)[number],
) {
  const response = await request.post(`${baseURL}/api/auth/login`, {
    data: {
      email: account.email,
      password: account.password,
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
      `${account.label} hesabı doğrulanamadı (HTTP ${response.status()}): ${
        payload.message || 'Giriş reddedildi.'
      }`,
    );
  }

  const token = String(payload.token || '');
  const user = payload.user;

  if (!token || !user?.id) {
    throw new Error(`${account.label} hesabında token veya kullanıcı bilgisi eksik.`);
  }

  if (!roleMatches(String(user.role || ''), account.expectedRole)) {
    throw new Error(
      `${account.label} hesabında beklenen rol ${account.expectedRole}, gelen ${String(
        user.role || 'BILINMIYOR',
      )}.`,
    );
  }

  return { token, user };
}

async function createAuthenticatedContext(
  browser: Browser,
  account: (typeof accounts)[number],
) {
  const context = await browser.newContext();
  const { token, user } = await authenticate(context.request, account);

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
  return { context, page, token, user };
}

function collectForbiddenKeys(value: unknown, path = '$'): string[] {
  const findings: string[] = [];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...collectForbiddenKeys(item, `${path}[${index}]`));
    });
    return findings;
  }

  if (!value || typeof value !== 'object') return findings;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9]/g, '');

    if (POOL_FORBIDDEN_OWNER_KEYS.has(normalized)) {
      findings.push(`${path}.${key}`);
    }

    findings.push(...collectForbiddenKeys(child, `${path}.${key}`));
  }

  return findings;
}

async function waitForNonAdminRedirect(page: Page, sourcePath: string) {
  await page.goto(sourcePath, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  await page.waitForLoadState('load').catch(() => undefined);
  await page.waitForTimeout(1200);

  const currentPath = new URL(page.url()).pathname;

  expect(
    currentPath,
    `${sourcePath} normal kullanıcı için Admin alanında kaldı.`,
  ).not.toBe(sourcePath);

  expect(
    currentPath,
    `${sourcePath} normal kullanıcıyı giriş ekranına attı; oturum korunmalı.`,
  ).not.toBe('/giris');

  expect(
    ['/dashboard', '/'].includes(currentPath),
    `${sourcePath} beklenmeyen hedefe yönlendi: ${currentPath}`,
  ).toBeTruthy();
}

test.describe('EPH Rol Yetki ve Mahremiyet Matrisi', () => {
  test('Oturumsuz istekler Admin API verisi alamıyor', async ({ request }) => {
    for (const path of ADMIN_API_ROUTES) {
      const response = await request.get(`${baseURL}${path}`, {
        timeout: 20_000,
      });

      expect(
        response.status(),
        `${path} oturumsuz kullanıcıya kapalı olmalı.`,
      ).toBe(401);
    }
  });

  for (const account of accounts) {
    test(`${account.label} Admin API'lerine erişemiyor ve Havuz hassas alan sızdırmıyor`, async ({
      browser,
    }) => {
      test.skip(
        !account.email || !account.password,
        `${account.label} test hesabı secret bilgileri eksik.`,
      );

      const { context, token } = await createAuthenticatedContext(browser, account);
      const headers = { Authorization: `Bearer ${token}` };

      for (const path of ADMIN_API_ROUTES) {
        const response = await context.request.get(`${baseURL}${path}`, {
          headers,
          timeout: 20_000,
        });

        expect(
          response.status(),
          `${account.label} ${path} endpointine erişebildi.`,
        ).toBe(403);
      }

      const poolResponse = await context.request.get(`${baseURL}/api/pool-projects`, {
        headers,
        timeout: 20_000,
      });

      expect(poolResponse.status()).toBe(200);
      const poolPayload = await poolResponse.json();
      const findings = collectForbiddenKeys(poolPayload);

      expect(
        findings,
        `${account.label} Havuz API yanıtında hassas sahip alanları buldu: ${findings.join(', ')}`,
      ).toEqual([]);

      await context.close();
    });

    test(`${account.label} Admin kullanıcı arayüzüne giremiyor`, async ({ browser }) => {
      test.skip(
        !account.email || !account.password,
        `${account.label} test hesabı secret bilgileri eksik.`,
      );

      const { context, page } = await createAuthenticatedContext(browser, account);

      for (const path of ADMIN_UI_ROUTES) {
        await waitForNonAdminRedirect(page, path);
      }

      await page.goto('/dashboard', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await page.waitForLoadState('load');
      await page.waitForTimeout(1200);

      const menuButton = page.getByRole('button', { name: 'Menü' });
      await expect(menuButton).toBeVisible();
      await menuButton.click();

      const drawer = page.locator('.eph-mobile-menu-drawer');
      await expect(drawer).toBeVisible();
      await expect(drawer.getByText('Duyurular', { exact: true })).toHaveCount(0);
      await expect(drawer.getByText('Referans Kodları', { exact: true })).toHaveCount(0);

      await context.close();
    });
  }
});
