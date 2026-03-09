import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.helper';
import { captureScreenshot } from '../helpers/screenshot.helper';

test.describe('13 - Settings / Thresholds', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page);
  });

  test('should display settings page with room selector', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('h1:has-text("Settings")');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Configure sensor thresholds')).toBeVisible();
    await expect(page.locator('text=Select Room')).toBeVisible();

    await captureScreenshot(page, 'settings--page-overview');
  });

  test('should display threshold cards', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('h1:has-text("Settings")');
    await page.waitForTimeout(1000);

    // Check for the three threshold sections
    await expect(page.getByRole('heading', { name: 'CO2 Thresholds' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Temperature Thresholds' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Humidity Thresholds' })).toBeVisible();

    await captureScreenshot(page, 'settings--threshold-cards');
  });

  test('should select a different room', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('h1:has-text("Settings")');
    await page.waitForTimeout(1000);

    // Click the room selector
    const roomSelect = page
      .locator('button[role="combobox"]')
      .filter({ hasText: /Select a room|Room/ })
      .first();

    if (await roomSelect.isVisible()) {
      await roomSelect.click();
      // Pick the second room if available
      const options = page.locator('[role="option"]');
      const count = await options.count();
      if (count > 1) {
        await options.nth(1).click();
        await page.waitForTimeout(1500);
        await captureScreenshot(page, 'settings--different-room-selected');
      }
    }
  });

  test('should update CO2 threshold', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('h1:has-text("Settings")');
    await page.waitForTimeout(1000);

    // Find the CO2 card: it contains the "CO2 Thresholds" heading and its inputs
    // The structure is: card div > h3 "CO2 Thresholds" + div with inputs + save button
    // Navigate from h3 to the grandparent card div which contains everything
    const co2Card = page.locator('h3:has-text("CO2 Thresholds")').locator('xpath=ancestor::div[contains(@class,"rounded-2xl")]');
    const maxInput = co2Card.locator('input[type="number"]').nth(1);

    if (await maxInput.isVisible()) {
      await maxInput.fill('1350');
      await captureScreenshot(page, 'settings--co2-threshold-changed');

      // Click Save CO2 Thresholds
      const saveBtn = page.locator('button:has-text("Save CO2 Thresholds")');
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
        await captureScreenshot(page, 'settings--co2-threshold-saved');
      }
    }
  });

  test('should update Temperature threshold', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('h1:has-text("Settings")');
    await page.waitForTimeout(1000);

    const saveBtn = page.locator('button:has-text("Save Temp Thresholds")');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
      await captureScreenshot(page, 'settings--temp-threshold-saved');
    }
  });
});
