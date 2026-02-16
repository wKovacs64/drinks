import { test, expect } from '#/playwright/playwright-utils';

test.describe('Edit Drink', () => {
  test('can edit an existing drink', async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto('/admin/drinks/test-margarita/edit');

    // Should see the form pre-filled with existing values
    await expect(pageAsAdmin.getByRole('heading', { name: 'Edit Drink' })).toBeVisible();
    await expect(pageAsAdmin.getByLabel('Title')).toHaveValue('Test Margarita');
    await expect(pageAsAdmin.getByLabel('Slug')).toHaveValue('test-margarita');
    await expect(pageAsAdmin.getByLabel('Calories')).toHaveValue('200');

    // Update the title
    await pageAsAdmin.getByLabel('Title').fill('Updated Margarita');

    // Submit the form
    await pageAsAdmin.getByRole('button', { name: 'Update Drink' }).click();

    // Should redirect to drinks list
    await expect(pageAsAdmin).toHaveURL('/admin/drinks');

    // Updated drink should appear in list
    await expect(pageAsAdmin.getByRole('cell', { name: 'Updated Margarita' })).toBeVisible();
  });

  test('edit form shows all existing drink data', async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto('/admin/drinks/test-mojito/edit');

    await expect(pageAsAdmin.getByLabel('Title')).toHaveValue('Test Mojito');
    await expect(pageAsAdmin.getByLabel('Slug')).toHaveValue('test-mojito');
    await expect(pageAsAdmin.getByLabel('Calories')).toHaveValue('150');

    const ingredientsValue = await pageAsAdmin
      .getByLabel('Ingredients (one per line)')
      .inputValue();
    expect(ingredientsValue).toContain('2 oz rum');
    expect(ingredientsValue).toContain('mint leaves');

    const tagsValue = await pageAsAdmin.getByLabel('Tags (comma-separated)').inputValue();
    expect(tagsValue).toContain('rum');
    expect(tagsValue).toContain('citrus');
  });
});
