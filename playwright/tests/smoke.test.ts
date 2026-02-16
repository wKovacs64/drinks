import { test, expect } from '#/playwright/playwright-utils';

test.describe('Smoke Tests', () => {
  test('homepage loads with seeded drinks', async ({ page, _resetDb }) => {
    await page.goto('/');

    // Check that seeded drinks appear
    await expect(page.getByText('Test Margarita')).toBeVisible();
    await expect(page.getByText('Test Mojito')).toBeVisible();
    await expect(page.getByText('Test Old Fashioned')).toBeVisible();
  });

  test('drink detail page loads', async ({ page, _resetDb }) => {
    await page.goto('/test-margarita');

    // Use heading role to avoid matching breadcrumb and notes
    await expect(page.getByRole('heading', { name: 'Test Margarita' })).toBeVisible();
    await expect(page.getByText('2 oz tequila')).toBeVisible();
    // calories
    await expect(page.getByText('200')).toBeVisible();
  });
});
