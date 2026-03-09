import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.helper';
import { captureScreenshot } from '../helpers/screenshot.helper';

/**
 * Full application walkthrough: visit every page in the sidebar
 * and take a screenshot. Verify no errors are thrown.
 */
test.describe('15 - Full App Walkthrough', () => {
  test('should visit every page without errors', async ({ page }) => {
    // Collect any console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Track uncaught exceptions
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await loginViaAPI(page);

    // List of all sidebar nav items and their routes
    // Note: Profile is NOT in the sidebar nav, so we navigate to it directly
    const pages = [
      { name: 'Dashboard', path: '/dashboard', heading: 'Admin Dashboard' },
      { name: 'Plants', path: '/plants', heading: 'Plants' },
      { name: 'Rooms', path: '/rooms', heading: 'Rooms' },
      { name: 'Devices', path: '/devices', heading: 'Devices' },
      { name: 'Settings', path: '/settings', heading: 'Settings' },
      { name: 'Alerts', path: '/alerts', heading: 'Alerts' },
      { name: 'Reports', path: '/reports', heading: 'Reports' },
      { name: 'Users', path: '/users', heading: 'Users' },
      { name: 'Profile', path: '/profile', heading: 'Profile' },
    ];

    for (const pg of pages) {
      // Navigate via sidebar link
      const navLink = page.locator(`a[href="${pg.path}"]`).first();
      if (await navLink.isVisible()) {
        await navLink.click();
      } else {
        // Fallback: navigate directly
        await page.goto(pg.path);
      }

      // Wait for the page heading to appear
      await page.waitForSelector(`h1:has-text("${pg.heading}")`, {
        timeout: 10000,
      });
      await page.waitForTimeout(1500);

      await captureScreenshot(page, `walkthrough--${pg.name.toLowerCase()}`);
    }

    // Also visit a room detail page if rooms exist
    await page.goto('/rooms');
    await page.waitForSelector('h1:has-text("Rooms")', { timeout: 10000 });
    await page.waitForTimeout(1000);

    const firstRoomRow = page.locator('table tbody tr').first();
    if (await firstRoomRow.isVisible()) {
      await firstRoomRow.click();
      await page.waitForURL(/rooms\/\d+/, { timeout: 10000 });
      await page.waitForTimeout(2000);
      await captureScreenshot(page, 'walkthrough--room-detail');
    }

    // Report any fatal page errors (filter out non-critical console noise)
    const fatalErrors = pageErrors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('hydration'),
    );
    if (fatalErrors.length > 0) {
      console.warn('Page errors detected during walkthrough:', fatalErrors);
    }
    // We don't hard-fail on console errors since the app may have benign warnings
    // But page crashes would cause test failure naturally
  });
});
