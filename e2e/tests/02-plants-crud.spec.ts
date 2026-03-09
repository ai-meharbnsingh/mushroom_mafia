import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.helper';
import { getAuthToken, createPlant } from '../helpers/api.helper';
import { captureScreenshot } from '../helpers/screenshot.helper';
import { TEST_PLANTS } from '../helpers/test-data';

test.describe('02 - Plants CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page);
  });

  test('should create first plant via UI', async ({ page }) => {
    await page.goto('/plants');
    await page.waitForSelector('h1');
    await captureScreenshot(page, 'plants--initial-empty');

    // Click "New Plant"
    await page.click('button:has-text("New Plant")');

    // Wait for the drawer/sheet to appear (Sheet uses radix dialog primitive)
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForSelector('text=Create New Plant', { timeout: 5000 });

    const plant = TEST_PLANTS[0];

    // Fill the form -- match exact placeholders from Plants.tsx
    await page.locator('[role="dialog"] input[placeholder="Enter plant name"]').fill(plant.plant_name);
    await page.locator('[role="dialog"] input[placeholder="e.g., NVF"]').fill(plant.plant_code);

    // Select type -- the Type dropdown is the only combobox inside the drawer
    const typeSelect = page.locator('[role="dialog"] button[role="combobox"]').first();
    await typeSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    const typeLabel = plant.plant_type.charAt(0) + plant.plant_type.slice(1).toLowerCase();
    await page.locator(`[role="option"]:has-text("${typeLabel}")`).click();

    await page.locator('[role="dialog"] input[placeholder="Enter location description"]').fill(plant.location);
    await page.locator('[role="dialog"] input[placeholder="City"]').fill(plant.city);
    await page.locator('[role="dialog"] input[placeholder="State"]').fill(plant.state);

    await captureScreenshot(page, 'plants--create-form-filled');

    // Click "Create Plant"
    await page.click('[role="dialog"] button:has-text("Create Plant")');

    // Wait for drawer to close and success
    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'plants--after-first-create');
  });

  test('should create second plant via UI', async ({ page }) => {
    await page.goto('/plants');
    await page.waitForSelector('h1');

    await page.click('button:has-text("New Plant")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForSelector('text=Create New Plant', { timeout: 5000 });

    const plant = TEST_PLANTS[1];

    await page.locator('[role="dialog"] input[placeholder="Enter plant name"]').fill(plant.plant_name);
    await page.locator('[role="dialog"] input[placeholder="e.g., NVF"]').fill(plant.plant_code);

    const typeSelect = page.locator('[role="dialog"] button[role="combobox"]').first();
    await typeSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    await page.locator(`[role="option"]:has-text("Button")`).click();

    await page.locator('[role="dialog"] input[placeholder="Enter location description"]').fill(plant.location);
    await page.locator('[role="dialog"] input[placeholder="City"]').fill(plant.city);
    await page.locator('[role="dialog"] input[placeholder="State"]').fill(plant.state);

    await page.click('[role="dialog"] button:has-text("Create Plant")');
    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'plants--after-second-create');
  });

  test('should create remaining 3 plants via API', async ({ request }) => {
    const token = await getAuthToken(request);

    for (let i = 2; i < TEST_PLANTS.length; i++) {
      const plant = TEST_PLANTS[i];
      const result = await createPlant(request, token, plant);
      expect(result.plant_id).toBeDefined();
    }
  });

  test('should verify all 5 plants in list', async ({ page }) => {
    await page.goto('/plants');
    await page.waitForSelector('table');
    await page.waitForTimeout(2000);

    // Verify each plant name appears
    for (const plant of TEST_PLANTS) {
      await expect(page.locator(`td:has-text("${plant.plant_name}")`).first()).toBeVisible();
    }

    await captureScreenshot(page, 'plants--all-five-listed');
  });

  test('should edit a plant', async ({ page }) => {
    await page.goto('/plants');
    await page.waitForSelector('table');
    await page.waitForTimeout(1000);

    // Click the edit button on the first plant row
    const firstEditBtn = page.locator('table tbody tr').first().locator('button').first();
    await firstEditBtn.click();

    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForSelector('text=Edit Plant', { timeout: 5000 });
    await captureScreenshot(page, 'plants--edit-drawer-open');

    // Modify the location field
    const locationInput = page.locator('[role="dialog"] input[placeholder="Enter location description"]');
    await locationInput.fill('Updated Industrial Park Location');

    await page.click('[role="dialog"] button:has-text("Save Changes")');
    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'plants--after-edit');
  });
});
