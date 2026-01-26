import { test, expect } from './playwright-utils';

test.describe('Smoke Tests', () => {
  test('homepage loads with seeded drinks', async ({ page, resetDb }) => {
    await page.goto('/');

    // Check that seeded drinks appear
    await expect(page.getByText('Test Margarita')).toBeVisible();
    await expect(page.getByText('Test Mojito')).toBeVisible();
    await expect(page.getByText('Test Old Fashioned')).toBeVisible();
  });

  test('drink detail page loads', async ({ page, resetDb }) => {
    await page.goto('/test-margarita');

    await expect(page.getByText('Test Margarita')).toBeVisible();
    await expect(page.getByText('2 oz tequila')).toBeVisible();
    // calories
    await expect(page.getByText('200')).toBeVisible();
  });
});
