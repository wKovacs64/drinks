import { test, expect } from './playwright-utils';

test.describe('Delete Drink', () => {
  test('can delete a drink', async ({ pageAsAdmin }) => {
    // First verify the drink exists in the list
    await pageAsAdmin.goto('/admin/drinks');
    await expect(pageAsAdmin.getByText('Test Old Fashioned')).toBeVisible();

    // Delete the drink via POST to the delete route
    const response = await pageAsAdmin.request.post('/admin/drinks/test-old-fashioned/delete');
    expect(response.status()).toBe(200);

    // Refresh the page and verify the drink is gone
    await pageAsAdmin.goto('/admin/drinks');
    await expect(pageAsAdmin.getByText('Test Old Fashioned')).not.toBeVisible();
  });

  test('delete returns 404 for non-existent drink', async ({ pageAsAdmin }) => {
    const response = await pageAsAdmin.request.post('/admin/drinks/non-existent-drink/delete');
    expect(response.status()).toBe(404);
  });

  test('delete only accepts POST method', async ({ pageAsAdmin }) => {
    // GET should redirect to the drinks list (loader redirects)
    const response = await pageAsAdmin.goto('/admin/drinks/test-margarita/delete');
    // After redirect, we should be at the drinks list
    expect(pageAsAdmin.url()).toBe('http://localhost:5173/admin/drinks');
    expect(response?.status()).toBe(200);
  });
});
