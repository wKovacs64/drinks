import { test, expect } from './playwright-utils';

test.describe('Admin Drinks List', () => {
  test('displays list of drinks with actions', async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto('/admin/drinks');

    // Should see heading
    await expect(pageAsAdmin.getByRole('heading', { name: 'Drinks' })).toBeVisible();

    // Should see "Add Drink" button
    await expect(pageAsAdmin.getByRole('link', { name: 'Add Drink' })).toBeVisible();

    // Should see seeded drinks in table
    await expect(pageAsAdmin.getByText('Test Margarita')).toBeVisible();
    await expect(pageAsAdmin.getByText('Test Mojito')).toBeVisible();
    await expect(pageAsAdmin.getByText('Test Old Fashioned')).toBeVisible();

    // Should see Edit links
    const editLinks = pageAsAdmin.getByRole('link', { name: 'Edit' });
    await expect(editLinks).toHaveCount(3);
  });

  test('Add Drink link navigates to new drink form', async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto('/admin/drinks');

    await pageAsAdmin.getByRole('link', { name: 'Add Drink' }).click();

    await expect(pageAsAdmin).toHaveURL('/admin/drinks/new');
  });
});
