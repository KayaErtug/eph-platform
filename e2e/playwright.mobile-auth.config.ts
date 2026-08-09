import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /mobile-auth\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['line'],
    ['html', { outputFolder: 'playwright-report-mobile-auth', open: 'never' }],
  ],
  timeout: 120_000,
  expect: {
    timeout: 12_000,
  },
  use: {
    baseURL:
      process.env.EPH_BASE_URL?.trim() || 'https://emlakportfoyhavuzu.com',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  outputDir: 'test-results-mobile-auth',
  projects: [
    {
      name: 'iphone-webkit-auth',
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit',
      },
    },
    {
      name: 'android-chromium-auth',
      use: {
        ...devices['Pixel 7'],
        browserName: 'chromium',
      },
    },
  ],
});
