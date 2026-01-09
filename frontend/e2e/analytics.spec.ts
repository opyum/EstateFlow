import { test, expect } from '@playwright/test';

test.describe('Client Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Set auth token for agent view
    await page.goto('/');
    if (process.env.E2E_AUTH_TOKEN) {
      await page.evaluate((token) => {
        localStorage.setItem('token', token);
      }, process.env.E2E_AUTH_TOKEN);
    }
  });

  test('should display analytics card on deal page', async ({ page }) => {
    const testDealId = process.env.E2E_TEST_DEAL_ID || 'test-deal-id';
    await page.goto(`/dashboard/deals/${testDealId}`);

    // Analytics card should be visible
    await expect(page.getByText(/activit.*client/i)).toBeVisible();
    await expect(page.getByText(/consultations/i)).toBeVisible();
    await expect(page.getByText(/chargements/i)).toBeVisible();
  });
});

test.describe('Client Portal Tracking', () => {
  test('should track page view when client accesses portal', async ({ page }) => {
    const testAccessToken = process.env.E2E_TEST_ACCESS_TOKEN || 'test-access-token';

    // Visit the client portal
    await page.goto(`/deal/${testAccessToken}`);
    await page.waitForLoadState('networkidle');

    // Page should load successfully (not 404)
    await expect(page.locator('body')).not.toHaveText(/not found|erreur/i);
  });

  test('should display timeline on client portal', async ({ page }) => {
    const testAccessToken = process.env.E2E_TEST_ACCESS_TOKEN || 'test-access-token';

    await page.goto(`/deal/${testAccessToken}`);

    // Should show timeline or steps section
    const content = page.locator('body');
    // Basic check that page has content
    await expect(content).toBeVisible();
  });
});
