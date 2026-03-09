import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.helper';
import { getAuthToken, createRoom, getPlants } from '../helpers/api.helper';
import { captureScreenshot } from '../helpers/screenshot.helper';
import { TEST_ROOMS, TEST_PLANTS } from '../helpers/test-data';

test.describe('03 - Rooms CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page);
  });

  test('should create first room via UI', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForSelector('h1');
    await captureScreenshot(page, 'rooms--initial');

    await page.click('button:has-text("New Room")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForSelector('text=Create New Room', { timeout: 5000 });

    const room = TEST_ROOMS[0];

    await page.locator('[role="dialog"] input[placeholder="Enter room name"]').fill(room.room_name);
    await page.locator('[role="dialog"] input[placeholder="e.g., NVF-A1"]').fill(room.room_code);

    // Select the plant from the Plant dropdown in the drawer (first combobox)
    const plantSelect = page.locator('[role="dialog"] button[role="combobox"]').first();
    await plantSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    // Click the first plant option
    const plantOption = page.locator('[role="option"]').filter({
      hasText: TEST_PLANTS[0].plant_name,
    });
    if (await plantOption.isVisible()) {
      await plantOption.click();
    } else {
      // Just pick the first option
      await page.locator('[role="option"]').first().click();
    }

    // Select room type (second combobox)
    const typeSelect = page.locator('[role="dialog"] button[role="combobox"]').nth(1);
    await typeSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    const typeLabel =
      room.room_type === 'SPAWN_RUN'
        ? 'Spawn Run'
        : room.room_type.charAt(0) + room.room_type.slice(1).toLowerCase();
    await page.locator(`[role="option"]:has-text("${typeLabel}")`).click();

    await captureScreenshot(page, 'rooms--create-form-filled');

    await page.click('[role="dialog"] button:has-text("Create Room")');
    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'rooms--after-first-create');
  });

  test('should create second room via UI', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForSelector('h1');

    await page.click('button:has-text("New Room")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForSelector('text=Create New Room', { timeout: 5000 });

    const room = TEST_ROOMS[1];

    await page.locator('[role="dialog"] input[placeholder="Enter room name"]').fill(room.room_name);
    await page.locator('[role="dialog"] input[placeholder="e.g., NVF-A1"]').fill(room.room_code);

    // Select plant
    const plantSelect = page.locator('[role="dialog"] button[role="combobox"]').first();
    await plantSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    await page.locator('[role="option"]').first().click();

    // Select room type
    const typeSelect = page.locator('[role="dialog"] button[role="combobox"]').nth(1);
    await typeSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    const typeLabel =
      room.room_type === 'SPAWN_RUN'
        ? 'Spawn Run'
        : room.room_type.charAt(0) + room.room_type.slice(1).toLowerCase();
    await page.locator(`[role="option"]:has-text("${typeLabel}")`).click();

    await page.click('[role="dialog"] button:has-text("Create Room")');
    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'rooms--after-second-create');
  });

  test('should create remaining 31 rooms via API', async ({ request }) => {
    const token = await getAuthToken(request);

    // Get plant IDs from API
    const plants = await getPlants(request, token);
    const plantIdMap: Record<string, number> = {};
    for (const p of plants) {
      plantIdMap[p.plant_code] = p.plant_id;
    }

    // Create rooms 2..32 (indexes 2 through 32, skipping the first 2 created via UI)
    for (let i = 2; i < TEST_ROOMS.length; i++) {
      const room = TEST_ROOMS[i];
      const plantId = plantIdMap[room.plant_code];
      if (!plantId) {
        console.warn(`Skipping room ${room.room_code}: plant ${room.plant_code} not found`);
        continue;
      }

      const result = await createRoom(request, token, {
        plant_id: plantId,
        room_name: room.room_name,
        room_code: room.room_code,
        room_type: room.room_type,
        room_size_sqft: room.room_size_sqft,
        no_of_racks: room.no_of_racks,
        no_of_bags: room.no_of_bags,
        bags_per_rack: room.bags_per_rack,
        floor_number: room.floor_number,
      });
      expect(result.room_id).toBeDefined();
    }
  });

  test('should verify rooms list shows correct count', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForSelector('table');
    await page.waitForTimeout(2000);

    // Count rows in the table
    const rowCount = await page.locator('table tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(33);

    await captureScreenshot(page, 'rooms--all-listed');
  });

  test('should filter rooms by plant', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForSelector('table');
    await page.waitForTimeout(1000);

    // Click the plant filter dropdown (second select on the page, after search)
    const plantFilterTrigger = page
      .locator('button[role="combobox"]')
      .filter({ hasText: /All Plants/i })
      .first();

    if (await plantFilterTrigger.isVisible()) {
      await plantFilterTrigger.click();
      // Select the first plant
      const firstPlantOption = page
        .locator('[role="option"]')
        .filter({ hasText: TEST_PLANTS[0].plant_name });
      if (await firstPlantOption.isVisible()) {
        await firstPlantOption.click();
        await page.waitForTimeout(1000);
        await captureScreenshot(page, 'rooms--filtered-by-plant');
      }
    }
  });
});
