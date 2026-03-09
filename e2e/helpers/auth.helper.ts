import { Page, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3800/api/v1';

/**
 * Login via direct API call, then inject the token into localStorage.
 * Useful for setup steps where we want to skip the UI.
 */
export async function loginViaAPI(page: Page, username = 'admin', password = 'admin123') {
  const response = await page.request.post(`${API_BASE}/auth/login`, {
    data: { username, password },
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();

  // Navigate first so we have a page context for localStorage
  await page.goto('/');
  await page.evaluate(
    ({ access, refresh }) => {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
    },
    { access: data.access_token, refresh: data.refresh_token },
  );
  await page.reload();
  // Wait for dashboard to load (indicates auth succeeded)
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
  return data;
}

/**
 * Login through the actual UI form on /login.
 */
export async function loginViaUI(page: Page, username = 'admin', password = 'admin123') {
  await page.goto('/login');
  await page.waitForSelector('form');

  // The login form has two inputs: text for username, password for password
  const usernameInput = page.locator('input[type="text"]');
  const passwordInput = page.locator('input[type="password"]');

  await usernameInput.fill(username);
  await passwordInput.fill(password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
}

/**
 * Logout by clicking the Logout button in the sidebar.
 */
export async function logout(page: Page) {
  // The sidebar has a Logout button with LogOut icon + "Logout" text
  const logoutBtn = page.locator('button', { hasText: 'Logout' });
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
  } else {
    // Sidebar may be collapsed -- the button still exists but text is hidden
    // Click the button with the LogOut icon
    const iconBtn = page.locator('aside button').filter({ has: page.locator('svg.lucide-log-out') });
    await iconBtn.click();
  }
  await page.waitForURL('**/login**', { timeout: 10000 });
}
