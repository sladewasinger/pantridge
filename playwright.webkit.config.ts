import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  projects: [
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit' } },
  ],
  // This one gesture test uses Chromium's CDP touch injection.
  grepInvert: /touch dragging/,
  workers: 3,
});
