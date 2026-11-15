import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  workers: 1,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Build first. Development mode intentionally disables the service worker.
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3100',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
