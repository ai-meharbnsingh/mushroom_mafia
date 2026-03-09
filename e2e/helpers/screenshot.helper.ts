import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Capture a full-page screenshot and save it to the e2e screenshots directory.
 * @param page - Playwright page
 * @param name - Descriptive name (e.g., "login--empty-form")
 */
export async function captureScreenshot(page: Page, name: string) {
  const dir = path.join(__dirname, '..', 'screenshots', 'e2e');
  fs.mkdirSync(dir, { recursive: true });
  const timestamp = Date.now();
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeName}--${timestamp}.png`;
  await page.screenshot({ path: path.join(dir, filename), fullPage: true });
}

/**
 * Capture a failure screenshot.
 * @param page - Playwright page
 * @param name - Descriptive name for the failure
 */
export async function captureFailureScreenshot(page: Page, name: string) {
  const dir = path.join(__dirname, '..', 'screenshots', 'e2e', 'failures');
  fs.mkdirSync(dir, { recursive: true });
  const timestamp = Date.now();
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeName}--${timestamp}.png`;
  await page.screenshot({ path: path.join(dir, filename), fullPage: true });
}
