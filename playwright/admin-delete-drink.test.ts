import { test, expect } from './playwright-utils';

test.describe('Delete Drink', () => {
  test('can delete a drink via the UI', async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto('/admin/drinks');
    await expect(pageAsAdmin.getByText('Test Old Fashioned')).toBeVisible();

    // Set up dialog handler before clicking delete
    pageAsAdmin.on('dialog', (dialog) => dialog.accept());

    // Click the delete button in the Test Old Fashioned row
    const row = pageAsAdmin.getByRole('row').filter({ hasText: 'Test Old Fashioned' });
    await row.getByRole('button', { name: 'Delete' }).click();

    // Drink should be removed from the list
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
    await expect(pageAsAdmin).toHaveURL('/admin/drinks');
    expect(response?.status()).toBe(200);
  });
});
