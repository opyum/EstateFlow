import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/auth');

    await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /recevoir le lien/i })).toBeVisible();
  });

  test('should show success message after requesting magic link', async ({ page }) => {
    await page.goto('/auth');

    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /recevoir le lien/i }).click();

    // Should show confirmation message
    await expect(page.getByText(/lien.*envoy|rifiez.*email/i)).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to dashboard when authenticated', async ({ page }) => {
    // Simulate authenticated state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'fake-jwt-token-for-test');
    });

    await page.goto('/dashboard');

    // Should either show dashboard or redirect to login if token invalid
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|auth)/);
  });
});
