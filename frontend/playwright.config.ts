import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3801',
    headless: false,
    slowMo: 500,
    screenshot: 'on',
    video: 'on-first-retry',
    trace: 'on-first-retry',
    viewport: { width: 1440, height: 900 },
  },
  outputDir: '../screenshots/e2e',
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
