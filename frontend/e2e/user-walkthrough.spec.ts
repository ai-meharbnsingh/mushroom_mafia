import { test, expect, Page } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCREENSHOT_DIR = join(__dirname, '..', '..', 'screenshots', 'user-view');

async function screenshot(page: Page, name: string) {
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

async function loginAsUser(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder="Enter your username"]', 'ignited');
  await page.fill('input[placeholder="Enter your password"]', 'ignited123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

// ═══════════════════════════════════════════
//  USER VIEW — What a MANAGER sees
// ═══════════════════════════════════════════
test.describe('User (MANAGER) Dashboard View', () => {

  test('user dashboard with yield, alerts, equipment', async ({ page }) => {
    test.setTimeout(120000);
    await loginAsUser(page);

    // 1. User Dashboard — top section
    await screenshot(page, '01-user-dashboard--top');

    // 2. Scroll to see yield summary + alerts
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(800);
    await screenshot(page, '02-user-dashboard--yield-alerts');

    // 3. Scroll to equipment matrix
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(800);
    await screenshot(page, '03-user-dashboard--equipment-matrix');

    // 4. Scroll to charts
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(800);
    await screenshot(page, '04-user-dashboard--charts');

    // 5. Full bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
    await screenshot(page, '05-user-dashboard--bottom');
  });

  test('user sees only their assigned plants', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsUser(page);

    await page.click('a[href="/plants"]');
    await page.waitForURL('**/plants');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await screenshot(page, '10-user-plants--filtered');
  });

  test('user sees only their rooms', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsUser(page);

    await page.click('a[href="/rooms"]');
    await page.waitForURL('**/rooms');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await screenshot(page, '20-user-rooms--filtered');

    // Scroll for more rooms
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    await screenshot(page, '21-user-rooms--scrolled');
  });

  test('user room detail with gauges and relays', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsUser(page);

    await page.click('a[href="/rooms"]');
    await page.waitForURL('**/rooms');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click first room row (table rows use onClick, not <a> links)
    const roomRow = page.locator('tr.cursor-pointer').first();
    if (await roomRow.isVisible()) {
      await roomRow.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await screenshot(page, '30-user-room-detail--top');

      // Stage timeline + gauges
      await page.evaluate(() => window.scrollTo(0, 400));
      await page.waitForTimeout(500);
      await screenshot(page, '31-user-room-detail--gauges');

      // Charts section
      await page.evaluate(() => window.scrollTo(0, 800));
      await page.waitForTimeout(500);
      await screenshot(page, '32-user-room-detail--charts');

      // Relay controls (7 relays)
      await page.evaluate(() => window.scrollTo(0, 1200));
      await page.waitForTimeout(500);
      await screenshot(page, '33-user-room-detail--relays');

      // Thresholds + device info
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      await screenshot(page, '34-user-room-detail--bottom');
    }
  });

  test('user sees their devices', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsUser(page);

    await page.click('a[href="/devices"]');
    await page.waitForURL('**/devices');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await screenshot(page, '40-user-devices--list');
  });

  test('user alerts view', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsUser(page);

    await page.click('a[href="/alerts"]');
    await page.waitForURL('**/alerts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await screenshot(page, '50-user-alerts--list');
  });

  test('user settings view', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsUser(page);

    await page.click('a[href="/settings"]');
    await page.waitForURL('**/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await screenshot(page, '60-user-settings--view');
  });

  test('user sidebar shows no admin links', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsUser(page);
    await page.waitForTimeout(1000);
    await screenshot(page, '70-user-sidebar--no-admin-links');

    // Verify Users and Firmware links are NOT visible (admin-only)
    const usersLink = page.locator('a[href="/users"]');
    const firmwareLink = page.locator('a[href="/firmware"]');
    await expect(usersLink).not.toBeVisible();
    await expect(firmwareLink).not.toBeVisible();
  });

  test('user cannot access admin routes', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsUser(page);

    // Try direct URL to admin-only pages
    await page.goto('/users');
    await page.waitForTimeout(2000);
    await screenshot(page, '80-user-blocked--users-page');

    await page.goto('/firmware');
    await page.waitForTimeout(2000);
    await screenshot(page, '81-user-blocked--firmware-page');
  });
});
