import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Document Upload', () => {
  // Skip if no auth - these tests require a logged-in user
  test.skip(({ browserName }) => !process.env.E2E_AUTH_TOKEN, 'Requires authentication');

  test.beforeEach(async ({ page }) => {
    // Set auth token
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, process.env.E2E_AUTH_TOKEN || '');
  });

  test('should open upload modal when clicking Add button', async ({ page }) => {
    // Navigate to a deal page (use test deal ID)
    const testDealId = process.env.E2E_TEST_DEAL_ID || 'test-deal-id';
    await page.goto(`/dashboard/deals/${testDealId}`);

    // Click the upload button
    await page.getByRole('button', { name: /ajouter/i }).click();

    // Modal should appear
    await expect(page.getByRole('heading', { name: /ajouter un document/i })).toBeVisible();
    await expect(page.getByText(/glissez un fichier/i)).toBeVisible();
  });

  test('should show drag and drop zone', async ({ page }) => {
    const testDealId = process.env.E2E_TEST_DEAL_ID || 'test-deal-id';
    await page.goto(`/dashboard/deals/${testDealId}`);

    await page.getByRole('button', { name: /ajouter/i }).click();

    // Drop zone should be visible
    const dropZone = page.locator('.border-dashed');
    await expect(dropZone).toBeVisible();
    await expect(page.getByText(/glissez un fichier/i)).toBeVisible();
  });
});
