import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
const channel =
  process.env['PLAYWRIGHT_CHANNEL'] ||
  (process.platform === 'win32' &&
  existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
    ? 'chrome'
    : undefined);
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    channel,
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: `"${process.execPath}" scripts/serve-production.mjs`,
    url: 'http://127.0.0.1:4173/login',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
