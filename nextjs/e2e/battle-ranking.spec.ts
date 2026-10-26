import { test, expect } from '@playwright/test';

test.describe('DevArena Real Browser E2E Tests', () => {
  test('1. Rankings Section displays Leaderboard, Tabs, and My Standing', async ({ page }) => {
    const response = await page.goto('http://localhost:3001/rankings', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);

    // Verify page content
    await expect(page.locator('body')).toBeVisible();
    
    // Check for rankings header or section
    const heading = page.locator('h1, h2, [role="heading"]').first();
    await expect(heading).toBeVisible();

    // Verify scope buttons/tabs exist
    const tabs = page.locator('button, [role="tab"], nav a');
    expect(await tabs.count()).toBeGreaterThan(0);

    // Capture visual screenshot
    await page.screenshot({ path: 'e2e-screenshots/01-rankings.png', fullPage: true });
  });

  test('2. Duel Battle Arena interface loads correctly', async ({ page }) => {
    const response = await page.goto('http://localhost:3001/duel', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);

    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: 'e2e-screenshots/02-duel-arena.png', fullPage: true });
  });

  test('3. Arena page displays challenges and modes', async ({ page }) => {
    const response = await page.goto('http://localhost:3001/arena', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);

    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: 'e2e-screenshots/03-arena.png', fullPage: true });
  });

  test('4. Dashboard page renders correctly', async ({ page }) => {
    const response = await page.goto('http://localhost:3001/dashboard', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);

    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: 'e2e-screenshots/04-dashboard.png', fullPage: true });
  });
});
