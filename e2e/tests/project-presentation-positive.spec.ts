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
  name?: string;
  setupStatus?: string;
};

type SharePayload = {
  token?: string;
  url?: string;
  expiresAt?: string;
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
    accountLabel: 'EPH Müteahhit sunum test hesabı',
    attempts: 2,
    timeoutMs: 30_000,
    retryDelayMs: 1_500,
  });

  const payload = result.payload;

  if (!result.ok) {
    throw new Error(
      `Müteahhit test hesabı doğrulanamadı (HTTP ${result.status}): ${
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

test.describe('EPH Gerçek Proje Sunum Linki Pozitif Kabul', () => {
  test.skip(
    !email || !password,
    'EPH Müteahhit test hesabı GitHub Secrets içinde tanımlı değil.',
  );

  test('Tamamlanmış proje varsa süreli sunum linki gerçek public ekranda açılıyor', async ({
    browser,
  }) => {
    const { token } = await authenticateMuteahhit();
    const context = await browser.newContext();
    const headers = { Authorization: `Bearer ${token}` };

    const projectsResponse = await context.request.get(
      `${baseURL}/api/project-sales/projects`,
      {
        headers,
        timeout: 20_000,
      },
    );

    expect(projectsResponse.status()).toBe(200);

    const projects = (await projectsResponse.json()) as ProjectRow[];
    expect(Array.isArray(projects)).toBeTruthy();

    const project = projects.find(
      (item) =>
        typeof item?.id === 'string' &&
        item.id.trim().length > 0 &&
        String(item.setupStatus || '').toLocaleUpperCase('tr-TR') === 'TAMAMLANDI',
    );

    test.skip(
      !project?.id,
      'Müteahhit test hesabında tamamlanmış proje yok; pozitif sunum linki testi veri oluşturmadan atlandı.',
    );

    const shareResponse = await context.request.post(
      `${baseURL}/api/project-sales/projects/${encodeURIComponent(
        String(project?.id),
      )}/launch/presentation-link`,
      {
        headers,
        timeout: 20_000,
      },
    );

    expect(
      shareResponse.status(),
      'Tamamlanmış proje için sunum linki üretilemedi.',
    ).toBeLessThan(300);

    const share = (await shareResponse.json()) as SharePayload;
    const shareToken = String(share.token || '').trim();

    expect(shareToken.length, 'Sunum tokenı boş döndü').toBeGreaterThan(20);
    expect(String(share.url || ''), 'Sunum URL alanı yanlış').toContain(
      `/proje-sunum/${shareToken}`,
    );

    const expiresAt = Date.parse(String(share.expiresAt || ''));
    expect(Number.isFinite(expiresAt), 'Sunum bitiş tarihi geçersiz').toBeTruthy();
    expect(expiresAt, 'Sunum linki oluşturulduğu anda süresi dolmuş').toBeGreaterThan(
      Date.now(),
    );

    const publicApiResponse = await context.request.get(
      `${baseURL}/api/project-presentation-share/${encodeURIComponent(shareToken)}`,
      {
        timeout: 20_000,
      },
    );

    expect(publicApiResponse.status()).toBe(200);

    const publicApiText = await publicApiResponse.text();
    expect(publicApiText.trim().length).toBeGreaterThan(20);
    expect(publicApiText).not.toMatch(/Forbidden resource|Internal Server Error/i);

    const page = await context.newPage();
    const pageResponse = await page.goto(
      `/proje-sunum/${encodeURIComponent(shareToken)}`,
      {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      },
    );

    expect(pageResponse).not.toBeNull();
    expect(pageResponse?.status() ?? 599).toBeLessThan(500);
    expect(new URL(page.url()).pathname).not.toBe('/giris');

    await page.waitForLoadState('load');

    await expect(
      page.getByText('Proje sunumu hazırlanıyor', { exact: true }),
    ).toHaveCount(0, { timeout: 20_000 });

    if (project?.name) {
      await expect(
        page.getByText(String(project.name), { exact: false }).first(),
      ).toBeVisible({ timeout: 15_000 });
    }

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(50);
    expect(bodyText).not.toMatch(/Hesabınıza giriş yapın/i);
    expect(bodyText).not.toMatch(/Sunum bağlantısı geçerli değil/i);
    expect(bodyText).not.toMatch(/Forbidden resource|Internal Server Error|Application error/i);

    if (project?.name) {
      expect(
        bodyText.toLocaleLowerCase('tr-TR'),
        'Gerçek proje adı public sunumda bulunamadı.',
      ).toContain(String(project.name).toLocaleLowerCase('tr-TR'));
    }

    await context.close();
  });
});
