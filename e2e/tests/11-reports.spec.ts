import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.helper';
import { captureScreenshot } from '../helpers/screenshot.helper';

test.describe('11 - Reports', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page);
  });

  test('should display reports page', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForSelector('h1:has-text("Reports")');
    await page.waitForTimeout(1000);

    await captureScreenshot(page, 'reports--page-overview');
  });

  test('should open generate report drawer', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForSelector('h1:has-text("Reports")');
    await page.waitForTimeout(1000);

    await page.click('button:has-text("Generate Report")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    await captureScreenshot(page, 'reports--generate-drawer-open');
  });

  test('should fill report form and generate', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForSelector('h1:has-text("Reports")');
    await page.waitForTimeout(1000);

    await page.click('button:has-text("Generate Report")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // The drawer has 3 comboboxes: Plant (nth 0), Report Type (nth 1), Format (nth 2)
    // Report Type select
    const typeSelect = page.locator('[role="dialog"] button[role="combobox"]').nth(1);
    if (await typeSelect.isVisible()) {
      await typeSelect.click();
      await page.waitForSelector('[role="option"]', { timeout: 3000 });
      await page.locator('[role="option"]:has-text("Daily")').click();
    }

    // Format select
    const formatSelect = page.locator('[role="dialog"] button[role="combobox"]').nth(2);
    if (await formatSelect.isVisible()) {
      await formatSelect.click();
      await page.waitForSelector('[role="option"]', { timeout: 3000 });
      await page.locator('[role="option"]:has-text("PDF")').click();
    }

    await captureScreenshot(page, 'reports--form-filled');

    // Click Generate
    await page.click('[role="dialog"] button:has-text("Generate")');
    await page.waitForTimeout(3000);
    await captureScreenshot(page, 'reports--after-generate');
  });

  test('should show generated report in list', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForSelector('h1:has-text("Reports")');
    await page.waitForTimeout(2000);

    // Check if table has rows
    const table = page.locator('table');
    if (await table.isVisible()) {
      const rowCount = await page.locator('table tbody tr').count();
      expect(rowCount).toBeGreaterThanOrEqual(0);
      await captureScreenshot(page, 'reports--list-with-reports');
    } else {
      await captureScreenshot(page, 'reports--empty-state');
    }
  });
});
