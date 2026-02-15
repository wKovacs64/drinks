import { test, expect } from '#/playwright/playwright-utils';

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
});
