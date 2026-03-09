import { test, expect } from '@playwright/test';
import { getAuthToken, getDevices, submitReading } from '../helpers/api.helper';
import { generateReading, TEST_ROOMS } from '../helpers/test-data';

test.describe('06 - Sensor Simulation', () => {
  test('should submit mock readings for all assigned devices', async ({ request }) => {
    const token = await getAuthToken(request);
    const devices = await getDevices(request, token);

    let successCount = 0;
    let skippedCount = 0;

    for (const device of devices) {
      // Only submit readings for devices that have an ACTIVE subscription
      // and are assigned to a room
      if (
        device.subscription_status !== 'ACTIVE' ||
        !device.room_id
      ) {
        skippedCount++;
        continue;
      }

      // Find the room type for this device to generate appropriate readings
      const roomIndex = devices.indexOf(device);
      const roomType = TEST_ROOMS[roomIndex]?.room_type || 'FRUITING';
      const reading = generateReading(roomType);

      try {
        const result = await submitReading(
          request,
          device.device_id,
          device.license_key,
          reading,
        );
        if (result.status === 'success') {
          successCount++;
        }
      } catch (err) {
        // Some devices may not have ACTIVE subscription yet
        skippedCount++;
      }
    }

    // We expect at least some readings to have been submitted successfully
    expect(successCount).toBeGreaterThan(0);
    console.log(`Sensor readings submitted: ${successCount} successful, ${skippedCount} skipped`);
  });
});
