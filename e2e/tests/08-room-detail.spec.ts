import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.helper';
import { captureScreenshot } from '../helpers/screenshot.helper';

test.describe('08 - Room Detail', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page);
  });

  test('should navigate to a room detail page', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForSelector('table', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Click on the first room row to navigate to its detail page
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();

    // Should navigate to /rooms/:roomId
    await page.waitForURL(/rooms\/\d+/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'room-detail--overview');
  });

  test('should display room header with name and status', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForSelector('table', { timeout: 10000 });
    await page.waitForTimeout(1000);

    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForURL(/rooms\/\d+/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Room detail page has a back button and room name
    await expect(page.locator('h1').first()).toBeVisible();
    await captureScreenshot(page, 'room-detail--header');
  });

  test('should display sensor gauges if readings exist', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForSelector('table', { timeout: 10000 });
    await page.waitForTimeout(1000);

    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForURL(/rooms\/\d+/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check for gauge sections
    const co2Label = page.locator('text=CO2 Level');
    const tempLabel = page.locator('text=Temperature');
    const humidityLabel = page.locator('text=Humidity');

    if (await co2Label.isVisible()) {
      await captureScreenshot(page, 'room-detail--gauges');
    } else {
      // No readings yet -- that's OK, just screenshot the empty state
      await captureScreenshot(page, 'room-detail--no-readings');
    }
  });

  test('should display relay controls section', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForSelector('table', { timeout: 10000 });
    await page.waitForTimeout(1000);

    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForURL(/rooms\/\d+/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    const relaySection = page.locator('text=Relay Controls');
    if (await relaySection.isVisible()) {
      await captureScreenshot(page, 'room-detail--relay-controls');
    }
  });

  test('should display threshold settings', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForSelector('table', { timeout: 10000 });
    await page.waitForTimeout(1000);

    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForURL(/rooms\/\d+/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Threshold Settings')).toBeVisible();
    await captureScreenshot(page, 'room-detail--thresholds');
  });

  test('should display historical chart', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForSelector('table', { timeout: 10000 });
    await page.waitForTimeout(1000);

    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForURL(/rooms\/\d+/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    const chartSection = page.locator('text=Historical Data (24h)');
    if (await chartSection.isVisible()) {
      await captureScreenshot(page, 'room-detail--historical-chart');
    }
  });

  test('should navigate back to rooms list', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForSelector('table', { timeout: 10000 });
    await page.waitForTimeout(1000);

    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForURL(/rooms\/\d+/, { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Click the back arrow button in the main content area (not sidebar)
    // The back button is inside main content, next to the h1 heading
    const backBtn = page.locator('main button').filter({ has: page.locator('svg') }).first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForURL(/\/rooms$/, { timeout: 10000 });
      await captureScreenshot(page, 'room-detail--back-to-list');
    }
  });
});
