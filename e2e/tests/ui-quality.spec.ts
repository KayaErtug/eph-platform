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

const email = process.env.EPH_TEST_EMLAKCI_EMAIL?.trim() || '';
const password = process.env.EPH_TEST_EMLAKCI_PASSWORD || '';

const PUBLIC_ROUTES = ['/giris', '/kayit', '/sifremi-unuttum'];
const AUTH_ROUTES = ['/dashboard', '/portfoy', '/crm', '/network', '/havuz'];

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

async function authenticate(request: APIRequestContext) {
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
      `EPH Emlakçı kalite hesabı doğrulanamadı (HTTP ${response.status()}): ${
        payload.message || 'Giriş reddedildi.'
      }`,
    );
  }

  const token = String(payload.token || '');
  const user = payload.user;

  if (!token || !user?.id || String(user.role || '') !== 'EMLAKCI') {
    throw new Error('EPH Emlakçı kalite hesabında token, kullanıcı veya rol geçersiz.');
  }

  return { token, user };
}

async function createAuthenticatedContext(browser: Browser) {
  const context = await browser.newContext();
  const { token, user } = await authenticate(context.request);

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

async function inspectDocument(page: Page, route: string) {
  const findings = await page.evaluate(() => {
    const isVisible = (element: Element) => {
      const node = element as HTMLElement;
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || '1') > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const duplicateIds = Array.from(document.querySelectorAll('[id]'))
      .map((element) => element.id)
      .filter(Boolean)
      .filter((id, index, values) => values.indexOf(id) !== index)
      .filter((id, index, values) => values.indexOf(id) === index);

    const unnamedInteractives: string[] = [];

    for (const element of Array.from(
      document.querySelectorAll('button, a[href], input, select, textarea'),
    )) {
      if (!isVisible(element)) continue;

      const html = element as HTMLElement;
      const tag = html.tagName.toLowerCase();
      const ariaLabel = html.getAttribute('aria-label')?.trim() || '';
      const ariaLabelledBy = html.getAttribute('aria-labelledby')?.trim() || '';
      const title = html.getAttribute('title')?.trim() || '';
      const text = html.innerText?.trim() || '';
      const id = html.id;

      let hasName = Boolean(ariaLabel || ariaLabelledBy || title || text);

      if (tag === 'input' || tag === 'select' || tag === 'textarea') {
        const input = html as HTMLInputElement;
        if (tag === 'input' && input.type === 'hidden') continue;

        const wrappingLabel = Boolean(html.closest('label'));
        const explicitLabel = Boolean(
          id && document.querySelector(`label[for="${CSS.escape(id)}"]`),
        );
        const placeholder = input.getAttribute('placeholder')?.trim() || '';
        const name = input.getAttribute('name')?.trim() || '';

        hasName = Boolean(
          ariaLabel ||
            ariaLabelledBy ||
            title ||
            wrappingLabel ||
            explicitLabel ||
            placeholder ||
            name,
        );
      }

      if (tag === 'a' && !hasName) {
        const imageAlt = html.querySelector('img[alt]')?.getAttribute('alt')?.trim() || '';
        hasName = Boolean(imageAlt);
      }

      if (!hasName) {
        unnamedInteractives.push(
          `${tag}${id ? `#${id}` : ''}${html.className ? `.${String(html.className).replace(/\s+/g, '.')}` : ''}`,
        );
      }
    }

    const lang = document.documentElement.getAttribute('lang') || '';
    const bodyText = document.body.innerText || '';

    return {
      duplicateIds,
      unnamedInteractives,
      lang,
      hasRawForbidden: /Forbidden resource|Internal Server Error|Application error/i.test(
        bodyText,
      ),
      hasWrongSuperAdminLabel: /Süper Admin/i.test(bodyText),
    };
  });

  expect(findings.lang.toLocaleLowerCase('tr-TR'), `${route} html lang`).toBe('tr');
  expect(findings.duplicateIds, `${route} duplicate id`).toEqual([]);
  expect(findings.unnamedInteractives, `${route} adsız etkileşim öğesi`).toEqual([]);
  expect(findings.hasRawForbidden, `${route} ham teknik hata gösteriyor`).toBeFalsy();
  expect(findings.hasWrongSuperAdminLabel, `${route} yanlış Süper Admin etiketi`).toBeFalsy();
}

async function expectNoHorizontalOverflow(page: Page, route: string) {
  const layout = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  expect(
    layout.documentWidth,
    `${route} document yatay taşıyor: ${JSON.stringify(layout)}`,
  ).toBeLessThanOrEqual(layout.innerWidth + 1);
  expect(
    layout.bodyWidth,
    `${route} body yatay taşıyor: ${JSON.stringify(layout)}`,
  ).toBeLessThanOrEqual(layout.innerWidth + 1);
}

test.describe('EPH UI Kalite ve Erişilebilirlik', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`Public semantik kalite: ${route}`, async ({ page }) => {
      const response = await page.goto(route, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      expect(response).not.toBeNull();
      expect(response?.status() ?? 599).toBeLessThan(500);
      await page.waitForLoadState('load');
      await inspectDocument(page, route);
      await expectNoHorizontalOverflow(page, route);
    });
  }

  test('Emlakçı kritik ekranlarında semantik kalite', async ({ browser }) => {
    test.skip(!email || !password, 'Emlakçı test hesabı secret bilgileri eksik.');

    const { context, page } = await createAuthenticatedContext(browser);

    for (const route of AUTH_ROUTES) {
      const response = await page.goto(route, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      expect(response).not.toBeNull();
      expect(response?.status() ?? 599).toBeLessThan(500);
      expect(new URL(page.url()).pathname).not.toBe('/giris');
      await page.waitForLoadState('load');
      await page.waitForTimeout(700);
      await inspectDocument(page, route);
      await expectNoHorizontalOverflow(page, route);
    }

    await context.close();
  });

  test('Mobil alt menü ve dokunma hedefleri kullanılabilir', async ({ browser }) => {
    test.skip(!email || !password, 'Emlakçı test hesabı secret bilgileri eksik.');

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });

    const { token, user } = await authenticate(context.request);

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
            state: { user: storedUser, token: storedToken },
            version: 0,
          }),
        );
      },
      { storedUser: user, storedToken: token },
    );

    const page = await context.newPage();
    await page.goto('/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    const nav = page.locator('.eph-mobile-bottom-nav');
    await expect(nav).toBeVisible();

    for (const label of ['Anasayfa', 'Portföy', 'CRM', 'Talep Merkezi', 'Havuz']) {
      const link = nav.getByText(label, { exact: true }).locator('..');
      await expect(link).toBeVisible();

      const box = await link.boundingBox();
      expect(box, `${label} dokunma hedefi bulunamadı`).not.toBeNull();
      expect(box?.height ?? 0, `${label} dokunma hedefi çok kısa`).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0, `${label} dokunma hedefi çok dar`).toBeGreaterThanOrEqual(44);
    }

    await inspectDocument(page, '/dashboard-mobile');
    await expectNoHorizontalOverflow(page, '/dashboard-mobile');

    await context.close();
  });
});
