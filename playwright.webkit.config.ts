import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  projects: [
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit' } },
  ],
  // CDP gestures are Chromium-only. WebKit's simulated offline mode bypasses
  // service workers; resilient-origin.spec.ts verifies an actual server outage.
  grepInvert: /touch dragging|offline/,
  workers: 3,
});
