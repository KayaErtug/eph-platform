import { test, expect, Page, BrowserContext } from "@playwright/test";
import fs from "fs";
import path from "path";

type RouteAudit = {
  route: string;
  status: "OK" | "UYARI" | "KRITIK";
  finalUrl: string;
  httpStatus: number | string;
  title: string;
  notes: string[];
  buttons: number;
  links: number;
  enabledButtons: number;
  disabledButtons: number;
  backButton: "VAR" | "YOK" | "GEREKMEZ" | "AUTH";
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  screenshot?: string;
};

type ButtonAudit = {
  route: string;
  index: number;
  label: string;
  beforeUrl: string;
  afterUrl: string;
  result: "OK" | "ATLANDI" | "HATA" | "BILGI";
  note: string;
};

const ROUTES = [
  "/",
  "/admin",
  "/admin/announcements",
  "/admin/audit-log",
  "/admin/help-center",
  "/admin/katilim-talepleri",
  "/admin/onay-sayfasi",
  "/admin/organization",
  "/admin/portfolio-approvals",
  "/admin/referrals",
  "/admin/reports",
  "/admin/settings",
  "/admin/system-messages",
  "/admin/turan",
  "/admin/users",
  "/cerez-politikasi",
  "/crm",
  "/crm/office-owner",
  "/crm/team-leader",
  "/dashboard",
  "/forum-v3",
  "/giris",
  "/gizlilik-politikasi",
  "/havuz",
  "/help-center",
  "/kayit",
  "/kontor",
  "/kullanici-sozlesmesi",
  "/kvkk",
  "/lina",
  "/market",
  "/messages",
  "/network",
  "/notification-settings",
  "/platform-anayasasi",
  "/portfoy",
  "/portfoy/quality",
  "/profil",
  "/stok",
  "/ucretlendirme",
  "/uyelik",
];

const PRIORITY_BUTTON_ROUTES = [
  "/",
  "/giris",
  "/dashboard",
  "/crm",
  "/portfoy",
  "/havuz",
  "/messages",
  "/kontor",
  "/lina",
  "/profil",
];

const NO_BACK_REQUIRED = new Set(["/", "/giris", "/kayit"]);

function cleanText(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeCell(value: unknown) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, "<br>");
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "root";
}

function firstItems(items: string[], max = 3) {
  return items.slice(0, max).map((item) => item.slice(0, 180));
}

function getBackRequired(route: string) {
  return !NO_BACK_REQUIRED.has(route);
}

async function loginIfConfigured(page: Page) {
  const email = process.env.EPH_TEST_EMAIL;
  const password = process.env.EPH_TEST_PASSWORD;

  if (!email || !password) return "ENV_LOGIN_YOK";

  await page.goto("/giris", { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(700);

  const emailInput = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="posta" i], input[placeholder*="mail" i]').first();
  const passwordInput = page.locator('input[type="password"], input[name*="password" i], input[placeholder*="şifre" i], input[placeholder*="sifre" i]').first();

  if (!(await emailInput.count().catch(() => 0)) || !(await passwordInput.count().catch(() => 0))) {
    return "LOGIN_FORM_BULUNAMADI";
  }

  await emailInput.fill(email).catch(() => {});
  await passwordInput.fill(password).catch(() => {});

  const submit = page.locator('button[type="submit"], button:has-text("Giriş"), button:has-text("Giris"), button:has-text("Oturum")').first();
  if (!(await submit.count().catch(() => 0))) return "LOGIN_BUTONU_BULUNAMADI";

  await submit.click().catch(() => {});
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});
  await page.waitForURL("**/dashboard**", { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const loginCookies = await page.context().cookies();
  const hasSessionCookie = loginCookies.some((cookie) =>
    /token|session|auth|jwt|next-auth|refresh/i.test(cookie.name),
  );

  if (!page.url().includes("/giris")) return hasSessionCookie ? "LOGIN_OK_COOKIE" : "LOGIN_OK_URL";
  return "LOGIN_BASARISIZ";
}

async function routeHasBackButton(page: Page) {
  try {
    const backCandidates = page.locator([
      'a:has-text("Geri")',
      'button:has-text("Geri")',
      '[aria-label*="Geri" i]',
      '[aria-label*="dön" i]',
      '[aria-label*="don" i]',
      'a[href="/admin"]',
      'a[href="/crm"]',
      'a[href="/dashboard"]',
      'a[href="/portfoy"]',
      'a[href="/havuz"]',
      'a[href="/messages"]',
      'a[href="/network"]',
    ].join(", "));

    return (await backCandidates.count()) > 0;
  } catch {
    return false;
  }
}

async function safeGoto(page: Page, route: string) {
  try {
    const response = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 25_000 });
    await page.waitForLoadState("networkidle", { timeout: 7_000 }).catch(() => {});
    return response;
  } catch {
    return null;
  }
}

async function safeGotoWithRetry(page: Page, route: string, retries = 1) {
  let lastResponse = null as Awaited<ReturnType<typeof safeGoto>>;

  for (let i = 0; i <= retries; i += 1) {
    lastResponse = await safeGoto(page, route);

    if (lastResponse && lastResponse.status() < 500) return lastResponse;
    await page.waitForTimeout(900);
  }

  return lastResponse;
}

async function auditRoute(page: Page, route: string, projectName: string): Promise<RouteAudit> {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const notes: string[] = [];

  page.on("dialog", async (dialog) => {
    await dialog.dismiss().catch(() => {});
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(cleanText(msg.text()));
  });

  page.on("pageerror", (error) => {
    pageErrors.push(cleanText(error.message));
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!url.includes("chrome-extension://") && !url.includes("favicon.ico")) {
      failedRequests.push(`${request.failure()?.errorText || "FAILED"} ${url}`);
    }
  });

  const response = await safeGotoWithRetry(page, route);
  const httpStatus = response?.status() || "NO_RESPONSE";
  const finalUrl = page.url();
  const title = cleanText(await page.title().catch(() => ""));
  const bodyText = cleanText(await page.locator("body").innerText({ timeout: 5_000 }).catch(() => ""));

  if (finalUrl.includes("/giris") && route !== "/giris") notes.push("AUTH_REDIRECT");
  if (httpStatus === "NO_RESPONSE") notes.push("NO_RESPONSE");
  if (String(httpStatus).startsWith("4")) notes.push("HTTP_4XX");
  if (String(httpStatus).startsWith("5")) notes.push("HTTP_5XX");
  if (!bodyText || bodyText.length < 20) notes.push("BOS_SAYFA_RISKI");
  if (/404|not found|bulunamadı|bulunamadi/i.test(bodyText)) notes.push("404_METNI");
  if (/500|internal server|server error/i.test(bodyText)) notes.push("500_METNI");
  if (pageErrors.length) notes.push("PAGE_ERROR");
  if (consoleErrors.length) notes.push("CONSOLE_ERROR");
  if (failedRequests.length) notes.push("FAILED_REQUEST");

  const buttons = await page.locator("button").count().catch(() => 0);
  const links = await page.locator("a[href]").count().catch(() => 0);
  const enabledButtons = await page.locator("button:not([disabled])").count().catch(() => 0);
  const disabledButtons = await page.locator("button[disabled]").count().catch(() => 0);

  let backButton: RouteAudit["backButton"] = "YOK";

  if (!getBackRequired(route)) {
    backButton = "GEREKMEZ";
  } else if (finalUrl.includes("/giris") && route !== "/giris") {
    backButton = "AUTH";
  } else {
    backButton = (await routeHasBackButton(page)) ? "VAR" : "YOK";
    if (backButton === "YOK") notes.push("GERI_TUSU_YOK");
  }

  const criticalSignals = ["HTTP_5XX", "500_METNI", "BOS_SAYFA_RISKI", "PAGE_ERROR"];
  const warningSignals = ["NO_RESPONSE", "HTTP_4XX", "404_METNI", "GERI_TUSU_YOK", "FAILED_REQUEST", "CONSOLE_ERROR"];
  const status: RouteAudit["status"] = notes.some((item) => criticalSignals.includes(item))
    ? "KRITIK"
    : notes.some((item) => warningSignals.includes(item))
      ? "UYARI"
      : "OK";

  let screenshot: string | undefined;

  if (status !== "OK") {
    const screenshotDir = path.resolve(process.cwd(), "test-results", "screenshots", projectName);
    fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, `${safeFileName(route)}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    screenshot = path.relative(process.cwd(), screenshotPath);
  }

  return {
    route,
    status,
    finalUrl,
    httpStatus,
    title,
    notes,
    buttons,
    links,
    enabledButtons,
    disabledButtons,
    backButton,
    consoleErrors: firstItems(consoleErrors),
    pageErrors: firstItems(pageErrors),
    failedRequests: firstItems(failedRequests),
    screenshot,
  };
}

async function auditSafeButtons(page: Page, route: string): Promise<ButtonAudit[]> {
  const output: ButtonAudit[] = [];
  await safeGotoWithRetry(page, route, 0);

  if (page.url().includes("/giris") && route !== "/giris") {
    output.push({
      route,
      index: 0,
      label: "-",
      beforeUrl: page.url(),
      afterUrl: page.url(),
      result: "ATLANDI",
      note: "Auth redirect.",
    });
    return output;
  }

  const safeButtonSelector = [
    'button:has-text("Yenile")',
    'button:has-text("Filtre")',
    'button:has-text("Ara")',
    'button:has-text("Liste")',
    'button:has-text("Harita")',
    'button:has-text("Kapat")',
    'button:has-text("Geri")',
    '[aria-label*="Kapat" i]',
    '[aria-label*="Yenile" i]',
    '[aria-label*="Filtre" i]',
    '[aria-label*="Geri" i]',
  ].join(", ");

  const buttons = page.locator(safeButtonSelector);
  const count = Math.min(await buttons.count().catch(() => 0), 6);

  if (!count) {
    output.push({
      route,
      index: 0,
      label: "-",
      beforeUrl: page.url(),
      afterUrl: page.url(),
      result: "BILGI",
      note: "Güvenli test edilecek buton bulunamadı.",
    });
    return output;
  }

  for (let i = 0; i < count; i += 1) {
    const currentButtons = page.locator(safeButtonSelector);
    const button = currentButtons.nth(i);
    const label =
      cleanText(await button.innerText().catch(() => "")) ||
      cleanText(await button.getAttribute("aria-label").catch(() => "")) ||
      `button-${i + 1}`;

    const beforeUrl = page.url();

    try {
      if (!(await button.isVisible().catch(() => false)) || !(await button.isEnabled().catch(() => false))) {
        output.push({
          route,
          index: i + 1,
          label,
          beforeUrl,
          afterUrl: page.url(),
          result: "ATLANDI",
          note: "Buton görünür/aktif değil.",
        });
        continue;
      }

      await button.click({ timeout: 4_000 }).catch((error) => {
        throw error;
      });
      await page.waitForTimeout(500);

      output.push({
        route,
        index: i + 1,
        label,
        beforeUrl,
        afterUrl: page.url(),
        result: "OK",
        note: beforeUrl === page.url() ? "Aynı sayfada kaldı." : "Route değişti.",
      });
    } catch (error: any) {
      output.push({
        route,
        index: i + 1,
        label,
        beforeUrl,
        afterUrl: page.isClosed() ? "PAGE_CLOSED" : page.url(),
        result: "HATA",
        note: cleanText(error?.message).slice(0, 180),
      });
    }
  }

  return output;
}

async function runWithLimit<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let index = 0;

  async function next() {
    const current = index;
    index += 1;

    if (current >= items.length) return;

    await worker(items[current]);
    await next();
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
}

function writeReports(input: {
  projectName: string;
  loginStatus: string;
  results: RouteAudit[];
  buttonResults: ButtonAudit[];
}) {
  const outDir = path.resolve(process.cwd(), "test-results");
  fs.mkdirSync(outDir, { recursive: true });

  const total = input.results.length;
  const ok = input.results.filter((item) => item.status === "OK").length;
  const warnings = input.results.filter((item) => item.status === "UYARI").length;
  const critical = input.results.filter((item) => item.status === "KRITIK").length;
  const backMissing = input.results.filter((item) => item.notes.includes("GERI_TUSU_YOK")).length;
  const criticalRoutes = input.results.filter((item) => item.status === "KRITIK").map((item) => item.route).slice(0, 10);
  const warningRoutes = input.results.filter((item) => item.status === "UYARI").map((item) => item.route).slice(0, 10);

  const md: string[] = [];
  md.push(`# EPH Otomatik Genel Denetim Raporu V4 — ${input.projectName}`);
  md.push("");
  md.push(`Tarih: ${new Date().toLocaleString("tr-TR")}`);
  md.push(`Login Durumu: ${input.loginStatus}`);
  md.push("");
  md.push("## Dashboard");
  md.push("");
  md.push(`✅ OK: ${ok}  ⚠️ UYARI: ${warnings}  🔴 KRİTİK: ${critical}`);
  md.push("");
  md.push(`- Toplam route: ${total}`);
  md.push(`- Geri tuşu eksik görünen: ${backMissing}`);
  md.push(`- Kritik rotalar: ${criticalRoutes.length ? criticalRoutes.join(", ") : "-"}`);
  md.push(`- Uyarılı rotalar: ${warningRoutes.length ? warningRoutes.join(", ") : "-"}`);
  md.push("");
  md.push("## Route Denetimi");
  md.push("");
  md.push("| Durum | Route | HTTP | Final URL | Buton | Aktif | Disabled | Link | Geri | Screenshot | Notlar |");
  md.push("|---|---|---:|---|---:|---:|---:|---:|---|---|---|");

  for (const item of input.results) {
    md.push(`| ${escapeCell(item.status)} | ${escapeCell(item.route)} | ${escapeCell(item.httpStatus)} | ${escapeCell(item.finalUrl)} | ${item.buttons} | ${item.enabledButtons} | ${item.disabledButtons} | ${item.links} | ${item.backButton} | ${escapeCell(item.screenshot || "-")} | ${escapeCell(item.notes.join(", ") || "-")} |`);
  }

  md.push("");
  md.push("## Hata Detayları");
  md.push("");

  for (const item of input.results.filter((entry) => entry.consoleErrors.length || entry.pageErrors.length || entry.failedRequests.length)) {
    md.push(`### ${item.route}`);
    if (item.consoleErrors.length) md.push(`- Console: ${escapeCell(item.consoleErrors.join(" / "))}`);
    if (item.pageErrors.length) md.push(`- PageError: ${escapeCell(item.pageErrors.join(" / "))}`);
    if (item.failedRequests.length) md.push(`- FailedRequest: ${escapeCell(item.failedRequests.join(" / "))}`);
    md.push("");
  }

  md.push("## Güvenli Buton Denetimi");
  md.push("");
  md.push("| Route | # | Buton | Sonuç | Not |");
  md.push("|---|---:|---|---|---|");

  for (const item of input.buttonResults) {
    md.push(`| ${escapeCell(item.route)} | ${item.index} | ${escapeCell(item.label)} | ${escapeCell(item.result)} | ${escapeCell(item.note)} |`);
  }

  md.push("");
  md.push("## Robot Kuralı");
  md.push("");
  md.push("- Sil / Onayla / Reddet / Havuza Gönder / Kontör harcayan işlemler güvenli modda tıklanmaz.");
  md.push("- Auth gereken sayfalar login ENV yoksa AUTH_REDIRECT olarak raporlanır.");
  md.push("- Robot otomatik kod onarımı yapmaz; rapor sonrası tam dosya yöntemiyle güvenli düzeltme yapılır.");

  const suffix = safeFileName(input.projectName);
  fs.writeFileSync(path.join(outDir, `eph-audit-report-${suffix}.md`), md.join("\n"), "utf8");
  fs.writeFileSync(path.join(outDir, `eph-audit-report-${suffix}.json`), JSON.stringify(input, null, 2), "utf8");

  fs.writeFileSync(path.join(outDir, "eph-audit-report.md"), md.join("\n"), "utf8");
  fs.writeFileSync(path.join(outDir, "eph-audit-report.json"), JSON.stringify(input, null, 2), "utf8");
}

test.describe("EPH Otomatik Denetim Robotu V4", () => {
  test("route + geri tuşu + güvenli buton denetimi", async ({ browser }, testInfo) => {
    const context = await browser.newContext();
    const loginPage = await context.newPage();
    const loginStatus = await loginIfConfigured(loginPage);
    await loginPage.close().catch(() => {});

    const results: RouteAudit[] = [];
    const buttonResults: ButtonAudit[] = [];
    const projectName = testInfo.project.name;

    await runWithLimit(ROUTES, 4, async (route) => {
      const page = await context.newPage();

      try {
        const result = await auditRoute(page, route, projectName);
        results.push(result);
      } catch (error: any) {
        results.push({
          route,
          status: "KRITIK",
          finalUrl: page.isClosed() ? "PAGE_CLOSED" : page.url(),
          httpStatus: "TEST_ERROR",
          title: "",
          notes: [`TEST_ERROR: ${cleanText(error?.message).slice(0, 180)}`],
          buttons: 0,
          links: 0,
          enabledButtons: 0,
          disabledButtons: 0,
          backButton: "YOK",
          consoleErrors: [],
          pageErrors: [],
          failedRequests: [],
        });
      } finally {
        await page.close().catch(() => {});
      }
    });

    for (const route of PRIORITY_BUTTON_ROUTES) {
      const page = await context.newPage();

      try {
        const safeButtonResults = await auditSafeButtons(page, route);
        buttonResults.push(...safeButtonResults);
      } catch (error: any) {
        buttonResults.push({
          route,
          index: 0,
          label: "-",
          beforeUrl: page.isClosed() ? "PAGE_CLOSED" : page.url(),
          afterUrl: page.isClosed() ? "PAGE_CLOSED" : page.url(),
          result: "HATA",
          note: cleanText(error?.message).slice(0, 180),
        });
      } finally {
        await page.close().catch(() => {});
      }
    }

    await context.close().catch(() => {});

    results.sort((a, b) => ROUTES.indexOf(a.route) - ROUTES.indexOf(b.route));

    writeReports({
      projectName,
      loginStatus,
      results,
      buttonResults,
    });

    expect(results.length).toBe(ROUTES.length);
  });
});
