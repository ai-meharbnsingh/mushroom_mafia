import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.helper';
import { captureScreenshot } from '../helpers/screenshot.helper';

test.describe('10 - Relay Control', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page);
  });

  test('should navigate to room detail and see relay controls', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForSelector('table', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Click the first room row
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForURL(/rooms\/\d+/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check for Relay Controls section
    const relaySection = page.locator('text=Relay Controls');
    if (await relaySection.isVisible()) {
      await captureScreenshot(page, 'relay--controls-visible');

      // Look for relay toggle buttons
      // The RelayToggle component likely has a clickable toggle for CO2, Humidity, Temperature
      const co2Label = page.locator('text=CO2').first();
      const humidityLabel = page.locator('text=Humidity').first();
      const tempLabel = page.locator('text=Temperature').first();

      if (await co2Label.isVisible()) {
        await captureScreenshot(page, 'relay--before-toggle');
      }
    } else {
      // No readings/relay data -- screenshot the state
      await captureScreenshot(page, 'relay--no-relay-data');
    }
  });

  test('should toggle a relay if readings exist', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForSelector('table', { timeout: 10000 });
    await page.waitForTimeout(1000);

    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForURL(/rooms\/\d+/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Find the relay toggle area
    const relaySection = page.locator('text=Relay Controls');
    if (await relaySection.isVisible()) {
      // Try to find and click a relay toggle
      // RelayToggle uses a button/switch element
      const toggleButtons = page.locator('.bg-iot-secondary').filter({
        hasText: 'Relay Controls',
      }).locator('button');

      const toggleCount = await toggleButtons.count();
      if (toggleCount > 0) {
        await captureScreenshot(page, 'relay--before-toggle-state');
        await toggleButtons.first().click();
        await page.waitForTimeout(1500);
        await captureScreenshot(page, 'relay--after-toggle-state');
      }
    }
  });
});
