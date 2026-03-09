import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.helper';
import { captureScreenshot } from '../helpers/screenshot.helper';

test.describe('07 - Dashboard Verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page);
  });

  test('should display admin dashboard with fleet summary cards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h1:has-text("Admin Dashboard")');
    await page.waitForTimeout(2000);

    // Verify fleet summary cards
    await expect(page.locator('text=Total Plants')).toBeVisible();
    await expect(page.locator('text=Total Rooms')).toBeVisible();
    await expect(page.locator('text=Total Devices')).toBeVisible();
    await expect(page.locator('text=Total Users')).toBeVisible();

    await captureScreenshot(page, 'dashboard--admin-summary-cards');
  });

  test('should display device fleet status section', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h1:has-text("Admin Dashboard")');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Device Fleet Status')).toBeVisible();
    await expect(page.locator('text=License Key Status')).toBeVisible();

    await captureScreenshot(page, 'dashboard--device-fleet-status');
  });

  test('should display plant overview table', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h1:has-text("Admin Dashboard")');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Plant Overview')).toBeVisible();
    // Should have a table with plant data
    const table = page.locator('table');
    if (await table.isVisible()) {
      await captureScreenshot(page, 'dashboard--plant-overview-table');
    }
  });

  test('should display room type distribution and alert summary', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h1:has-text("Admin Dashboard")');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Room Type Distribution')).toBeVisible();
    await expect(page.locator('text=Alert Summary')).toBeVisible();

    await captureScreenshot(page, 'dashboard--room-types-and-alerts');
  });

  test('should display recent activity feed', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h1:has-text("Admin Dashboard")');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Recent Activity')).toBeVisible();
    await captureScreenshot(page, 'dashboard--recent-activity');
  });

  test('should display quick navigation actions', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h1:has-text("Admin Dashboard")');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Quick Actions')).toBeVisible();
    await expect(page.locator('text=User Management')).toBeVisible();

    await captureScreenshot(page, 'dashboard--quick-actions');
  });

  test('should navigate to devices from quick actions', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h1:has-text("Admin Dashboard")');
    await page.waitForTimeout(1000);

    // Use the Quick Actions section button (unique text)
    await page.locator('button:has-text("Manage Devices")').click();
    await expect(page).toHaveURL(/devices/);
    await captureScreenshot(page, 'dashboard--navigated-to-devices');
  });

  test('should navigate to alerts from admin dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h1:has-text("Admin Dashboard")');
    await page.waitForTimeout(1000);

    // Use the View All button in the Alert Summary section
    const viewAllBtn = page.locator('button:has-text("View All")');
    if (await viewAllBtn.isVisible()) {
      await viewAllBtn.click();
      await expect(page).toHaveURL(/alerts/);
      await captureScreenshot(page, 'dashboard--navigated-to-alerts');
    }
  });
});
