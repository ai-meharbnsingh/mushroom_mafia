import { test, expect } from '@playwright/test';
import { loginViaUI, logout } from '../helpers/auth.helper';
import { captureScreenshot } from '../helpers/screenshot.helper';

test.describe('01 - Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form');
    await expect(page.getByRole('heading', { name: 'MushroomIoT' })).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await captureScreenshot(page, 'login--empty-form');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form');

    const usernameInput = page.locator('input[type="text"]');
    const passwordInput = page.locator('input[type="password"]');

    await usernameInput.fill('wronguser');
    await passwordInput.fill('wrongpass');
    await page.click('button[type="submit"]');

    // Wait for error message to appear
    await page.waitForSelector('text=/invalid|error|incorrect|locked/i', { timeout: 10000 });
    await captureScreenshot(page, 'login--invalid-credentials');
  });

  test('should login with valid credentials via UI', async ({ page }) => {
    await loginViaUI(page, 'admin', 'admin123');

    // Should be on dashboard
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();
    await captureScreenshot(page, 'login--success-dashboard');
  });

  test('should logout successfully', async ({ page }) => {
    await loginViaUI(page, 'admin', 'admin123');
    await expect(page).toHaveURL(/dashboard/);

    await logout(page);

    // Should be back on login
    await expect(page).toHaveURL(/login/);
    await captureScreenshot(page, 'login--after-logout');
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
    await captureScreenshot(page, 'login--redirect-from-dashboard');
  });
});
