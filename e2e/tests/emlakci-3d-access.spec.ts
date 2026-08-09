import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
} from '@playwright/test';

const email = process.env.EPH_TEST_EMLAKCI_EMAIL?.trim() || '';
const password = process.env.EPH_TEST_EMLAKCI_PASSWORD || '';
const baseURL =
  process.env.EPH_BASE_URL?.trim().replace(/\/$/, '') ||
  'https://emlakportfoyhavuzu.com';

type AuthUser = {
  id?: string;
  email?: string;
  role?: string;
};

type AuthPayload = {
  token?: string;
  user?: AuthUser;
  message?: string;
};

async function authenticateEmlakci(request: APIRequestContext) {
  const response = await request.post(`${baseURL}/api/auth/login`, {
    data: { email, password },
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
    throw new Error('EPH Emlakçı test hesabında token veya kullanıcı bilgisi eksik.');
  }

  if (user.role !== 'EMLAKCI') {
    throw new Error(
      `EPH 3D regresyon hesabının rolü EMLAKCI değil: ${String(
        user.role || 'BILINMIYOR',
      )}`,
    );
  }

  return { token, user };
}

async function createAuthenticatedPage(browser: Browser) {
  const context = await browser.newContext();
  const { token, user } = await authenticateEmlakci(context.request);

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
  return { context, page };
}

test.describe('EPH Emlakçı 3D Yetki Regresyonu', () => {
  test.skip(
    !email || !password,
    'EPH Emlakçı test hesabı GitHub Secrets içinde tanımlı değil.',
  );

  test('Emlakçı 3D Stüdyo yerine kullanıcı dostu uyarı ve Havuza Dön görür', async ({
    browser,
  }) => {
    const { context, page } = await createAuthenticatedPage(browser);

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

    await context.close();
  });
});
