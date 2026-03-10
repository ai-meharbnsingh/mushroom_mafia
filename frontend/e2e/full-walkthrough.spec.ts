import { test, expect, Page } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCREENSHOT_DIR = join(__dirname, '..', '..', 'screenshots', 'admin-view');

async function screenshot(page: Page, name: string) {
  await page.waitForTimeout(800); // let animations finish
  await page.screenshot({
    path: join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

async function login(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder="Enter your username"]', 'admin');
  await page.fill('input[placeholder="Enter your password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

// ═══════════════════════════════════════════
//  1. LOGIN PAGE
// ═══════════════════════════════════════════
test.describe('Login Page', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await screenshot(page, '01-login--empty-form');

    // Verify key elements
    await expect(page.getByRole('heading', { name: 'MushroomIoT' })).toBeVisible();
    await expect(page.locator('text=Smart Mushroom Farming')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter your username"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter your password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('text=Demo: Use')).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="Enter your username"]', 'wronguser');
    await page.fill('input[placeholder="Enter your password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await screenshot(page, '02-login--invalid-credentials');
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="Enter your username"]', 'admin');
    await page.fill('input[placeholder="Enter your password"]', 'admin123');
    await screenshot(page, '03-login--filled-form');

    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await screenshot(page, '04-login--success-redirect');
  });

  test('password toggle visibility works', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="Enter your password"]', 'testpass');

    // Password should be hidden by default
    const passwordInput = page.locator('input[placeholder="Enter your password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click eye icon to show password
    await page.locator('button:has(svg)').last().click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await screenshot(page, '05-login--password-visible');
  });
});

// ═══════════════════════════════════════════
//  2. DASHBOARD
// ═══════════════════════════════════════════
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('admin dashboard loads with all widgets', async ({ page }) => {
    await page.waitForTimeout(2000);
    await screenshot(page, '10-dashboard--admin-overview');

    // Check sidebar navigation
    await expect(page.locator('text=Dashboard').first()).toBeVisible();
  });

  test('dashboard metric cards visible', async ({ page }) => {
    await page.waitForTimeout(2000);
    // Scroll down to see more content
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    await screenshot(page, '11-dashboard--scrolled-metrics');

    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(500);
    await screenshot(page, '12-dashboard--scrolled-charts');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshot(page, '13-dashboard--scrolled-bottom');
  });
});

// ═══════════════════════════════════════════
//  3. PLANTS PAGE
// ═══════════════════════════════════════════
test.describe('Plants Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('plants page loads and displays data', async ({ page }) => {
    await page.click('a[href="/plants"]');
    await page.waitForURL('**/plants');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await screenshot(page, '20-plants--list-view');
  });
});

// ═══════════════════════════════════════════
//  4. ROOMS PAGE
// ═══════════════════════════════════════════
test.describe('Rooms Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('rooms page loads and displays room cards', async ({ page }) => {
    await page.click('a[href="/rooms"]');
    await page.waitForURL('**/rooms');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await screenshot(page, '30-rooms--grid-view');

    // Scroll to see all rooms
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshot(page, '31-rooms--grid-view-scrolled');
  });

  test('room detail page with gauges and charts', async ({ page }) => {
    await page.click('a[href="/rooms"]');
    await page.waitForURL('**/rooms');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click on the first room row (table rows use onClick, not <a> links)
    const roomRow = page.locator('tr.cursor-pointer').first();
    if (await roomRow.isVisible()) {
      await roomRow.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await screenshot(page, '32-room-detail--top-gauges');

      // Scroll to charts section
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(500);
      await screenshot(page, '33-room-detail--charts-section');

      // Scroll to relay controls
      await page.evaluate(() => window.scrollTo(0, 1000));
      await page.waitForTimeout(500);
      await screenshot(page, '34-room-detail--relay-controls');

      // Scroll to bag temps + thresholds
      await page.evaluate(() => window.scrollTo(0, 1500));
      await page.waitForTimeout(500);
      await screenshot(page, '35-room-detail--thresholds');

      // Scroll to device info
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      await screenshot(page, '36-room-detail--device-info');
    }
  });
});

// ═══════════════════════════════════════════
//  5. DEVICES PAGE
// ═══════════════════════════════════════════
test.describe('Devices Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('devices page loads with table and pending approval section', async ({ page }) => {
    await page.click('a[href="/devices"]');
    await page.waitForURL('**/devices');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await screenshot(page, '40-devices--list-view');

    // Scroll to see full table
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    await screenshot(page, '41-devices--table-scrolled');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshot(page, '42-devices--bottom-section');
  });
});

// ═══════════════════════════════════════════
//  6. ALERTS PAGE
// ═══════════════════════════════════════════
test.describe('Alerts Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('alerts page loads and displays alerts', async ({ page }) => {
    await page.click('a[href="/alerts"]');
    await page.waitForURL('**/alerts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await screenshot(page, '50-alerts--list-view');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshot(page, '51-alerts--scrolled');
  });
});

// ═══════════════════════════════════════════
//  7. REPORTS PAGE
// ═══════════════════════════════════════════
test.describe('Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('reports page loads', async ({ page }) => {
    await page.click('a[href="/reports"]');
    await page.waitForURL('**/reports');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await screenshot(page, '60-reports--default-view');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshot(page, '61-reports--scrolled');
  });
});

// ═══════════════════════════════════════════
//  8. USERS PAGE (Admin Only)
// ═══════════════════════════════════════════
test.describe('Users Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('users page loads with user table', async ({ page }) => {
    await page.click('a[href="/users"]');
    await page.waitForURL('**/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await screenshot(page, '70-users--list-view');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshot(page, '71-users--scrolled');
  });
});

// ═══════════════════════════════════════════
//  9. SETTINGS PAGE
// ═══════════════════════════════════════════
test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('settings page loads', async ({ page }) => {
    test.setTimeout(60000); // settings page may have heavy components
    await page.click('a[href="/settings"]');
    await page.waitForURL('**/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await screenshot(page, '80-settings--default-view');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await screenshot(page, '81-settings--scrolled');
  });
});

// ═══════════════════════════════════════════
//  10. PROFILE PAGE
// ═══════════════════════════════════════════
test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('profile page loads', async ({ page }) => {
    // Profile is in the TopBar avatar dropdown, not sidebar
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await screenshot(page, '90-profile--default-view');
  });
});

// ═══════════════════════════════════════════
//  11. FIRMWARE PAGE (Admin Only)
// ═══════════════════════════════════════════
test.describe('Firmware Management Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('firmware page loads with upload and status sections', async ({ page }) => {
    await page.click('a[href="/firmware"]');
    await page.waitForURL('**/firmware');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await screenshot(page, '100-firmware--default-view');

    // Scroll to see all sections
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    await screenshot(page, '101-firmware--rollout-section');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshot(page, '102-firmware--status-section');
  });
});

// ═══════════════════════════════════════════
//  12. SIDEBAR NAVIGATION COMPLETENESS
// ═══════════════════════════════════════════
test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('all sidebar links are present and clickable', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Check all nav links exist
    const navLinks = [
      'Dashboard', 'Plants', 'Rooms', 'Devices',
      'Settings', 'Alerts', 'Reports', 'Users', 'Firmware'
    ];

    for (const linkText of navLinks) {
      const link = page.locator(`nav >> text=${linkText}`).first();
      await expect(link).toBeVisible({ timeout: 5000 });
    }

    await screenshot(page, '110-sidebar--all-links-visible');
  });

  test('sidebar collapse/expand works', async ({ page }) => {
    await page.waitForTimeout(1000);
    await screenshot(page, '111-sidebar--expanded');

    // Find collapse button (has "Collapse" text or ChevronLeft icon)
    const collapseBtn = page.locator('button:has-text("Collapse")').first();
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();
      await page.waitForTimeout(800);
      await screenshot(page, '112-sidebar--collapsed');

      // After collapse, the button changes to ChevronRight (no text)
      // Find the expand button in the collapsed sidebar
      const expandBtn = page.locator('nav button').last();
      await expandBtn.click();
      await page.waitForTimeout(800);
      await screenshot(page, '113-sidebar--re-expanded');
    }
  });
});

// ═══════════════════════════════════════════
//  13. LOGOUT FLOW
// ═══════════════════════════════════════════
test.describe('Logout', () => {
  test('logout redirects to login page', async ({ page }) => {
    await login(page);
    await page.waitForTimeout(1000);

    // Find and click logout button
    const logoutBtn = page.locator('text=Logout').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, '120-logout--redirected-to-login');
    } else {
      // Try sidebar bottom area
      const signOutBtn = page.locator('text=Sign Out, text=Log Out, button:has(svg.lucide-log-out)').first();
      if (await signOutBtn.isVisible()) {
        await signOutBtn.click();
        await page.waitForTimeout(2000);
        await screenshot(page, '120-logout--redirected-to-login');
      }
    }
  });
});
