import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.helper';
import { getAuthToken, getDevices, submitReading, getAlerts } from '../helpers/api.helper';
import { captureScreenshot } from '../helpers/screenshot.helper';
import { generateHighCO2Reading } from '../helpers/test-data';

test.describe('09 - Alerts', () => {
  test('should submit a high CO2 reading to trigger an alert', async ({ request }) => {
    const token = await getAuthToken(request);
    const devices = await getDevices(request, token);

    // Find a device that is ACTIVE and assigned to a room
    const activeDevice = devices.find(
      (d: any) => d.subscription_status === 'ACTIVE' && d.room_id,
    );

    if (activeDevice) {
      const reading = generateHighCO2Reading();
      const result = await submitReading(
        request,
        activeDevice.device_id,
        activeDevice.license_key,
        reading,
      );
      expect(result.status).toBe('success');
    }
  });

  test('should display alerts page with tabs', async ({ page }) => {
    await loginViaAPI(page);
    await page.goto('/alerts');
    await page.waitForSelector('h1:has-text("Alerts")');
    await page.waitForTimeout(2000);

    // Verify tabs exist
    await expect(page.locator('text=/Active \\(/')).toBeVisible();
    await expect(page.locator('text=/Acknowledged \\(/')).toBeVisible();
    await expect(page.locator('text=/Resolved \\(/')).toBeVisible();

    await captureScreenshot(page, 'alerts--page-overview');
  });

  test('should show alerts in the active tab', async ({ page }) => {
    await loginViaAPI(page);
    await page.goto('/alerts');
    await page.waitForSelector('h1:has-text("Alerts")');
    await page.waitForTimeout(2000);

    // Check if there are any active alerts
    const alertRows = page.locator('table tbody tr');
    const count = await alertRows.count();

    if (count > 0) {
      await captureScreenshot(page, 'alerts--active-list');
    } else {
      await captureScreenshot(page, 'alerts--no-active-alerts');
    }
  });

  test('should acknowledge an alert if one exists', async ({ page }) => {
    await loginViaAPI(page);
    await page.goto('/alerts');
    await page.waitForSelector('h1:has-text("Alerts")');
    await page.waitForTimeout(2000);

    // Look for an acknowledge button (Check icon) in the actions column
    const ackBtn = page.locator('button[title="Acknowledge"]').first();
    if (await ackBtn.isVisible()) {
      await captureScreenshot(page, 'alerts--before-acknowledge');
      await ackBtn.click();
      await page.waitForTimeout(2000);
      await captureScreenshot(page, 'alerts--after-acknowledge');
    } else {
      // No alerts to acknowledge
      await captureScreenshot(page, 'alerts--no-alerts-to-ack');
    }
  });

  test('should view alert detail dialog', async ({ page }) => {
    await loginViaAPI(page);
    await page.goto('/alerts');
    await page.waitForSelector('h1:has-text("Alerts")');
    await page.waitForTimeout(1000);

    // Click "All" tab to see all alerts
    const allTab = page.locator('button[role="tab"]').filter({ hasText: /All/ });
    if (await allTab.isVisible()) {
      await allTab.click();
      await page.waitForTimeout(1000);
    }

    // Click the view/eye button on an alert row
    const viewBtn = page
      .locator('table tbody tr')
      .first()
      .locator('button')
      .first();

    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await page.waitForSelector('text=Alert Details', { timeout: 5000 });
      await captureScreenshot(page, 'alerts--detail-dialog');

      // Close dialog
      await page.keyboard.press('Escape');
    }
  });

  test('should filter alerts by severity', async ({ page }) => {
    await loginViaAPI(page);
    await page.goto('/alerts');
    await page.waitForSelector('h1:has-text("Alerts")');
    await page.waitForTimeout(1000);

    // Click "All" tab first
    const allTab = page.locator('button[role="tab"]').filter({ hasText: /All/ });
    if (await allTab.isVisible()) {
      await allTab.click();
      await page.waitForTimeout(1000);
    }

    // Open severity filter
    const severityFilter = page
      .locator('button[role="combobox"]')
      .filter({ hasText: /All Severities/i })
      .first();

    if (await severityFilter.isVisible()) {
      await severityFilter.click();
      const warningOption = page.locator('[role="option"]:has-text("Warning")');
      if (await warningOption.isVisible()) {
        await warningOption.click();
        await page.waitForTimeout(1000);
        await captureScreenshot(page, 'alerts--filtered-by-severity');
      }
    }
  });
});
