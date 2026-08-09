import {
  expect,
  test,
  type Browser,
} from '@playwright/test';

import { loginWithStandaloneRequest } from './helpers/live-auth';

const email = process.env.EPH_TEST_MUTEAHHIT_EMAIL?.trim() || '';
const password = process.env.EPH_TEST_MUTEAHHIT_PASSWORD || '';
const baseURL =
  process.env.EPH_BASE_URL?.trim().replace(/\/$/, '') ||
  'https://emlakportfoyhavuzu.com';

type AuthUser = {
  id?: string;
  role?: string;
};

type ProjectRow = {
  id?: string;
};

function isMuteahhitRole(role?: string) {
  const normalized = String(role || '').toLocaleUpperCase('tr-TR');
  return ['MUTEAHHIT', 'MÜTEAHHİT', 'MÜTAHHİT'].includes(normalized);
}

async function authenticateMuteahhit() {
  const result = await loginWithStandaloneRequest<AuthUser>({
    baseURL,
    email,
    password,
    accountLabel: 'EPH Müteahhit 3D test hesabı',
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

  if (!token || !user?.id || !isMuteahhitRole(user.role)) {
    throw new Error('Müteahhit test hesabının token, kullanıcı veya rol bilgisi geçersiz.');
  }

  return { token, user };
}

async function createAuthenticatedPage(browser: Browser) {
  const { token, user } = await authenticateMuteahhit();
  const context = await browser.newContext();

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
  return { context, page, token };
}

async function expectNoTechnicalError(pageText: string, context: string) {
  for (const pattern of [
    /application error/i,
    /internal server error/i,
    /forbidden resource/i,
    /cannot read properties of/i,
    /referenceerror/i,
    /typeerror:/i,
    /chunkloaderror/i,
  ]) {
    expect(pageText, `${context} teknik hata gösteriyor: ${pattern}`).not.toMatch(pattern);
  }
}

test.describe('EPH Müteahhit Gerçek Proje 3D Salt Okunur Kabul', () => {
  test.skip(
    !email || !password,
    'EPH Müteahhit test hesabı GitHub Secrets içinde tanımlı değil.',
  );

  test('Mevcut proje varsa 3D Stüdyo ve Render erişimi rol nedeniyle engellenmiyor', async ({
    browser,
  }) => {
    const { context, page, token } = await createAuthenticatedPage(browser);
    const authHeaders = { Authorization: `Bearer ${token}` };

    const projectsResponse = await context.request.get(
      `${baseURL}/api/project-sales/projects`,
      {
        headers: authHeaders,
        timeout: 20_000,
      },
    );

    expect(projectsResponse.status()).toBe(200);

    const projects = (await projectsResponse.json()) as ProjectRow[];
    expect(Array.isArray(projects)).toBeTruthy();

    const projectId = String(
      projects.find((project) => typeof project?.id === 'string' && project.id.trim())?.id || '',
    ).trim();

    test.skip(!projectId, 'Müteahhit test hesabında 3D erişimi test edilecek mevcut proje yok.');

    const sceneResponse = await context.request.get(
      `${baseURL}/api/project-sales/projects/${encodeURIComponent(projectId)}/scene`,
      {
        headers: authHeaders,
        timeout: 20_000,
      },
    );

    expect(
      sceneResponse.status(),
      'Müteahhit kendi proje scene endpointinde yetkisiz sayılmamalı.',
    ).not.toBe(401);
    expect(
      sceneResponse.status(),
      'Müteahhit kendi proje scene endpointinde rol nedeniyle engellenmemeli.',
    ).not.toBe(403);
    expect(
      sceneResponse.status(),
      `Scene endpoint HTTP ${sceneResponse.status()} döndürdü.`,
    ).toBeLessThan(500);

    const studioPath = `/proje-satis-sablonu/3d/${encodeURIComponent(projectId)}`;
    const studioResponse = await page.goto(studioPath, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    expect(studioResponse).not.toBeNull();
    expect(studioResponse?.status() ?? 599).toBeLessThan(500);
    expect(new URL(page.url()).pathname).not.toBe('/giris');

    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    const studioText = await page.locator('body').innerText();
    expect(studioText.trim().length).toBeGreaterThan(0);
    expect(studioText).not.toContain('3D Stüdyo Erişimi Kısıtlı');
    await expectNoTechnicalError(studioText, '3D Stüdyo');

    const renderPath = `${studioPath}/render`;
    const renderResponse = await page.goto(renderPath, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    expect(renderResponse).not.toBeNull();
    expect(renderResponse?.status() ?? 599).toBeLessThan(500);
    expect(new URL(page.url()).pathname).not.toBe('/giris');

    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    const renderText = await page.locator('body').innerText();
    expect(renderText.trim().length).toBeGreaterThan(0);
    expect(renderText).not.toContain('3D Stüdyo Erişimi Kısıtlı');
    await expectNoTechnicalError(renderText, 'Render ekranı');

    await context.close();
  });
});
