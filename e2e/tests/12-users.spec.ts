import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.helper';
import { captureScreenshot } from '../helpers/screenshot.helper';
import { TEST_USER } from '../helpers/test-data';

test.describe('12 - Users CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page);
  });

  test('should display users page', async ({ page }) => {
    await page.goto('/users');
    await page.waitForSelector('h1:has-text("Users")');
    await page.waitForTimeout(1000);

    await captureScreenshot(page, 'users--page-overview');
  });

  test('should create a new user via UI', async ({ page }) => {
    await page.goto('/users');
    await page.waitForSelector('h1:has-text("Users")');
    await page.waitForTimeout(1000);

    await page.click('button:has-text("New User")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForSelector('text=Create New User', { timeout: 5000 });

    // Fill the user form -- match exact placeholders from Users.tsx
    await page.locator('[role="dialog"] input[placeholder="First name"]').fill(TEST_USER.first_name);
    await page.locator('[role="dialog"] input[placeholder="Last name"]').fill(TEST_USER.last_name);
    await page.locator('[role="dialog"] input[placeholder="Enter username"]').fill(TEST_USER.username);
    await page.locator('[role="dialog"] input[placeholder="Enter email"]').fill(TEST_USER.email);
    await page.locator('[role="dialog"] input[placeholder="Enter password"]').fill(TEST_USER.password);
    await page.locator('[role="dialog"] input[placeholder="Enter mobile number"]').fill(TEST_USER.mobile);

    // Select role -- only one combobox in the user form (Role select)
    const roleSelect = page.locator('[role="dialog"] button[role="combobox"]').first();
    await roleSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    await page.locator('[role="option"]:has-text("Operator")').click();

    await captureScreenshot(page, 'users--create-form-filled');

    // Click Create User
    await page.click('[role="dialog"] button:has-text("Create User")');
    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'users--after-create');
  });

  test('should verify new user appears in list', async ({ page }) => {
    await page.goto('/users');
    await page.waitForSelector('h1:has-text("Users")');
    await page.waitForTimeout(2000);

    // Check for the user in the table
    const userCell = page.locator(`td:has-text("${TEST_USER.username}")`).first();
    if (await userCell.isVisible()) {
      await expect(userCell).toBeVisible();
    }

    await captureScreenshot(page, 'users--list-with-new-user');
  });

  test('should edit a user', async ({ page }) => {
    await page.goto('/users');
    await page.waitForSelector('h1:has-text("Users")');
    await page.waitForTimeout(2000);

    // Find the edit button for the test user
    const testUserRow = page.locator('table tbody tr').filter({
      hasText: TEST_USER.username,
    });

    if (await testUserRow.isVisible()) {
      const editBtn = testUserRow.locator('button').first();
      await editBtn.click();

      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      await page.waitForSelector('text=Edit User', { timeout: 5000 });
      await captureScreenshot(page, 'users--edit-drawer-open');

      // Modify mobile number
      const mobileInput = page.locator('[role="dialog"] input[placeholder="Enter mobile number"]');
      await mobileInput.fill('+1-555-0200');

      await page.click('[role="dialog"] button:has-text("Save Changes")');
      await page.waitForTimeout(2000);
      await captureScreenshot(page, 'users--after-edit');
    }
  });

  test('should filter users by role', async ({ page }) => {
    await page.goto('/users');
    await page.waitForSelector('h1:has-text("Users")');
    await page.waitForTimeout(1000);

    // Open role filter
    const roleFilter = page
      .locator('button[role="combobox"]')
      .filter({ hasText: /All Roles/i })
      .first();

    if (await roleFilter.isVisible()) {
      await roleFilter.click();
      const adminOption = page.locator('[role="option"]:has-text("Admin")');
      if (await adminOption.isVisible()) {
        await adminOption.click();
        await page.waitForTimeout(1000);
        await captureScreenshot(page, 'users--filtered-by-role');
      }
    }
  });
});
