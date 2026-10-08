import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/full',
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:5178',
    ...devices['iPhone 13'],
    defaultBrowserType: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev:full --test',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: !process.env.CI,
  },
});
