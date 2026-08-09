import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test';

const baseURL =
  process.env.EPH_BASE_URL?.trim().replace(/\/$/, '') ||
  'https://emlakportfoyhavuzu.com';

const emlakciEmail = process.env.EPH_TEST_EMLAKCI_EMAIL?.trim() || '';
const emlakciPassword = process.env.EPH_TEST_EMLAKCI_PASSWORD || '';
const muteahhitEmail = process.env.EPH_TEST_MUTEAHHIT_EMAIL?.trim() || '';
const muteahhitPassword = process.env.EPH_TEST_MUTEAHHIT_PASSWORD || '';

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

async function authenticateRole(
  request: APIRequestContext,
  email: string,
  password: string,
  expectedRole: 'EMLAKCI' | 'MUTEAHHIT',
) {
  const response = await request.post(`${baseURL}/api/auth/login`, {
    data: { email, password },
    timeout: 25_000,
  });

  let payload: AuthPayload = {};
  try {
    payload = (await response.json()) as AuthPayload;
  } catch {
    payload = {};
  }

  if (!response.ok()) {
    throw new Error(
      `${expectedRole} test hesabı doğrulanamadı (HTTP ${response.status()}): ${
        payload.message || 'Giriş reddedildi.'
      }`,
    );
  }

  const token = String(payload.token || '');
  const user = payload.user;

  if (!token || !user?.id) {
    throw new Error(`${expectedRole} test hesabında token veya kullanıcı eksik.`);
  }

  if (user.role !== expectedRole) {
    throw new Error(
      `Beklenen rol ${expectedRole}, gelen rol ${String(user.role || 'BILINMIYOR')}.`,
    );
  }

  return { token, user };
}

async function prepareAuthenticatedContext(
  context: BrowserContext,
  email: string,
  password: string,
  expectedRole: 'EMLAKCI' | 'MUTEAHHIT',
) {
  const { token, user } = await authenticateRole(
    context.request,
    email,
    password,
    expectedRole,
  );

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

  return { token, user };
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

async function expectHealthyPage(page: Page, path: string) {
  const response = await page.goto(path, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  expect(response, `${path} response alınamadı`).not.toBeNull();
  expect(response?.status() ?? 599, `${path} HTTP 5xx`).toBeLessThan(500);
  expect(new URL(page.url()).pathname, `${path} oturumu kaybetti`).not.toBe('/giris');
  await expect(page.locator('body')).toBeVisible();
  await expectNoHorizontalOverflow(page, path);
}

async function openHydratedMenu(page: Page) {
  await page.goto('/dashboard', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.waitForLoadState('load');
  await page.waitForTimeout(1200);

  const menuButton = page.getByRole('button', { name: 'Menü' });
  await expect(menuButton).toBeVisible();
  await menuButton.click();

  await expect(page.locator('.eph-mobile-menu-drawer')).toBeVisible();
}

test.describe('EPH Mobil Oturumlu Roller', () => {
  test('Emlakçı iPhone ve Android ana mobil yolculuğu', async ({ context }) => {
    test.skip(
      !emlakciEmail || !emlakciPassword,
      'Emlakçı test hesabı secret bilgileri eksik.',
    );

    await prepareAuthenticatedContext(
      context,
      emlakciEmail,
      emlakciPassword,
      'EMLAKCI',
    );

    const page = await context.newPage();

    for (const path of ['/dashboard', '/portfoy', '/crm', '/network', '/havuz']) {
      await expectHealthyPage(page, path);
    }

    await openHydratedMenu(page);

    await expect(page.getByText('Emlakçı', { exact: true })).toBeVisible();
    await expect(page.getByText('Proje Satış Merkezi', { exact: true })).toHaveCount(0);
  });

  test('Müteahhit iPhone ve Android Proje Satış yolculuğu', async ({ context }) => {
    test.skip(
      !muteahhitEmail || !muteahhitPassword,
      'Müteahhit test hesabı secret bilgileri eksik.',
    );

    await prepareAuthenticatedContext(
      context,
      muteahhitEmail,
      muteahhitPassword,
      'MUTEAHHIT',
    );

    const page = await context.newPage();

    for (const path of ['/dashboard', '/portfoy', '/crm', '/network', '/havuz']) {
      await expectHealthyPage(page, path);
    }

    await expectHealthyPage(page, '/proje-satis-sablonu');

    await openHydratedMenu(page);

    await expect(page.getByText('Müteahhit', { exact: true })).toBeVisible();
    await expect(page.getByText('Proje Satış Merkezi', { exact: true })).toBeVisible();
  });
});
