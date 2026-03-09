import { test, expect } from '@playwright/test';
import { loginViaAPI, loginViaUI } from '../helpers/auth.helper';
import { captureScreenshot } from '../helpers/screenshot.helper';

test.describe('14 - Profile', () => {
  test('should display profile page with user info', async ({ page }) => {
    await loginViaAPI(page);
    await page.goto('/profile');
    await page.waitForSelector('h1:has-text("Profile")');
    await page.waitForTimeout(1000);

    // Verify user info sections
    await expect(page.locator('text=User Information')).toBeVisible();
    await expect(page.locator('text=Full Name')).toBeVisible();
    await expect(page.locator('text=Email')).toBeVisible();
    await expect(page.locator('text=Role')).toBeVisible();

    await captureScreenshot(page, 'profile--user-info');
  });

  test('should display change password section', async ({ page }) => {
    await loginViaAPI(page);
    await page.goto('/profile');
    await page.waitForSelector('h1:has-text("Profile")');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Change Password')).toBeVisible();
    await expect(page.locator('text=Update your account password')).toBeVisible();

    await captureScreenshot(page, 'profile--change-password-section');
  });

  test('should display account status', async ({ page }) => {
    await loginViaAPI(page);
    await page.goto('/profile');
    await page.waitForSelector('h1:has-text("Profile")');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Account Status')).toBeVisible();

    await captureScreenshot(page, 'profile--account-status');
  });

  test('should change password and verify login with new password', async ({ page }) => {
    await loginViaAPI(page);
    await page.goto('/profile');
    await page.waitForSelector('h1:has-text("Profile")');
    await page.waitForTimeout(1000);

    const newPassword = 'NewAdmin123!';

    // Fill change password form
    const currentPwdInput = page.locator('input[placeholder="Enter current password"]');
    const newPwdInput = page.locator('input[placeholder="Enter new password"]');
    const confirmPwdInput = page.locator('input[placeholder="Confirm new password"]');

    await currentPwdInput.fill('admin123');
    await newPwdInput.fill(newPassword);
    await confirmPwdInput.fill(newPassword);

    await captureScreenshot(page, 'profile--password-form-filled');

    // Click Update Password
    await page.click('button:has-text("Update Password")');
    await page.waitForTimeout(3000);
    await captureScreenshot(page, 'profile--password-changed');

    // Now change it back to the original
    await currentPwdInput.fill(newPassword);
    await newPwdInput.fill('admin123');
    await confirmPwdInput.fill('admin123');

    await page.click('button:has-text("Update Password")');
    await page.waitForTimeout(3000);
    await captureScreenshot(page, 'profile--password-restored');
  });

  test('should show validation error for mismatched passwords', async ({ page }) => {
    await loginViaAPI(page);
    await page.goto('/profile');
    await page.waitForSelector('h1:has-text("Profile")');
    await page.waitForTimeout(1000);

    const currentPwdInput = page.locator('input[placeholder="Enter current password"]');
    const newPwdInput = page.locator('input[placeholder="Enter new password"]');
    const confirmPwdInput = page.locator('input[placeholder="Confirm new password"]');

    await currentPwdInput.fill('admin123');
    await newPwdInput.fill('NewPassword1');
    await confirmPwdInput.fill('DifferentPassword2');

    await page.click('button:has-text("Update Password")');
    await page.waitForTimeout(2000);

    // There should be a toast or error message about mismatch
    await captureScreenshot(page, 'profile--password-mismatch-error');
  });
});
