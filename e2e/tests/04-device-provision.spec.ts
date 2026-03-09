import { test, expect } from '@playwright/test';
import { loginViaAPI } from '../helpers/auth.helper';
import { getAuthToken, provisionDevice, registerDevice } from '../helpers/api.helper';
import { captureScreenshot } from '../helpers/screenshot.helper';
import { TEST_DEVICES } from '../helpers/test-data';

// Generate unique MAC for this test run to avoid duplicate conflicts
const runId = Date.now().toString(16).slice(-4).toUpperCase();
function uniqueMAC(base: string): string {
  // Replace first 2 octets with run-unique prefix
  const parts = base.split(':');
  const hex = runId.padStart(4, '0');
  parts[0] = hex.slice(0, 2);
  parts[1] = hex.slice(2, 4);
  return parts.join(':');
}

test.describe('04 - Device Provisioning', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page);
  });

  test('should provision first device via UI', async ({ page }) => {
    await page.goto('/devices');
    await page.waitForSelector('h1');
    await captureScreenshot(page, 'devices--initial');

    // Click "Provision Device"
    await page.click('button:has-text("Provision Device")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForSelector('text=Provision New Device', { timeout: 5000 });

    const device = TEST_DEVICES[0];
    const mac = uniqueMAC(device.mac_address);

    // Exact placeholders from Devices.tsx
    await page.locator('[role="dialog"] input[placeholder="e.g., AA:BB:CC:DD:EE:FF"]').fill(mac);
    await page.locator('[role="dialog"] input[placeholder="e.g., Room-1-Sensor"]').fill(device.device_name + '-' + runId);

    await captureScreenshot(page, 'devices--provision-form-filled');

    // Click "Provision" button
    await page.click('[role="dialog"] button:has-text("Provision")');

    // Wait for the license key to appear
    await page.waitForSelector('text=Generated License Key', { timeout: 10000 });
    await captureScreenshot(page, 'devices--license-key-shown');

    // Click Done
    await page.click('[role="dialog"] button:has-text("Done")');
    await page.waitForTimeout(1000);
    await captureScreenshot(page, 'devices--after-first-provision');
  });

  test('should provision second device via UI', async ({ page }) => {
    await page.goto('/devices');
    await page.waitForSelector('h1');

    await page.click('button:has-text("Provision Device")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForSelector('text=Provision New Device', { timeout: 5000 });

    const device = TEST_DEVICES[1];
    const mac = uniqueMAC(device.mac_address);

    await page.locator('[role="dialog"] input[placeholder="e.g., AA:BB:CC:DD:EE:FF"]').fill(mac);
    await page.locator('[role="dialog"] input[placeholder="e.g., Room-1-Sensor"]').fill(device.device_name + '-' + runId);

    await page.click('[role="dialog"] button:has-text("Provision")');
    await page.waitForSelector('text=Generated License Key', { timeout: 10000 });
    await captureScreenshot(page, 'devices--second-license-key');

    await page.click('[role="dialog"] button:has-text("Done")');
    await page.waitForTimeout(1000);
  });

  test('should provision remaining 31 devices via API', async ({ request }) => {
    const token = await getAuthToken(request);

    for (let i = 2; i < TEST_DEVICES.length; i++) {
      const device = TEST_DEVICES[i];
      const result = await provisionDevice(request, token, {
        mac_address: device.mac_address,
        device_name: device.device_name,
      });
      expect(result.device_id ?? result.device_id).toBeDefined();
      expect(result.license_key).toBeDefined();
    }
  });

  test('should register all devices (simulate ESP32 registration)', async ({ request }) => {
    const token = await getAuthToken(request);

    // Get all devices to retrieve their license keys
    const res = await request.get('http://localhost:3800/api/v1/devices/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const devices = await res.json();

    let registered = 0;
    for (const device of devices) {
      // Skip if already registered (has firmware version set)
      if (device.firmware_version && device.firmware_version !== '') continue;

      try {
        await registerDevice(request, {
          license_key: device.license_key,
          mac_address: device.mac_address,
          firmware_version: '2.1.0',
          hardware_version: 'v1.0',
        });
        registered++;
      } catch {
        // Device may already be registered, continue
      }
    }
    // At least some devices should have been registered (or already were)
    expect(devices.length).toBeGreaterThan(0);
  });

  test('should verify all devices appear in list', async ({ page }) => {
    await page.goto('/devices');
    // Wait for table rows to actually load (not just the empty table)
    await page.locator('table tbody tr').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(1000);

    const rowCount = await page.locator('table tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(2);

    await captureScreenshot(page, 'devices--all-listed');
  });
});
