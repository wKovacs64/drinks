import { test, expect } from './playwright-utils';

test.describe('Create New Drink', () => {
  test('can create a new drink', async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto('/admin/drinks/new');

    // Should see the form
    await expect(pageAsAdmin.getByRole('heading', { name: 'Add New Drink' })).toBeVisible();

    // Fill out the form
    await pageAsAdmin.getByLabel('Title').fill('New Test Drink');
    await pageAsAdmin.getByLabel('Slug').fill('new-test-drink');
    await pageAsAdmin.getByLabel('Ingredients (one per line)').fill('1 oz vodka\n2 oz juice');
    await pageAsAdmin.getByLabel('Calories').fill('120');
    await pageAsAdmin.getByLabel('Tags (comma-separated)').fill('vodka, juice');
    await pageAsAdmin.getByLabel('Notes (markdown)').fill('A test drink');
    await pageAsAdmin.getByLabel('Rank').fill('5');

    // Submit - since no image was cropped, form submits normally with placeholder
    await pageAsAdmin.getByRole('button', { name: 'Create Drink' }).click();

    // Should redirect to drinks list
    await expect(pageAsAdmin).toHaveURL('/admin/drinks');

    // New drink should appear in list
    await expect(pageAsAdmin.getByText('New Test Drink', { exact: true })).toBeVisible();
  });

  test('new drink form has required fields', async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto('/admin/drinks/new');

    // Title, Slug, Ingredients, Calories, and Tags should be required
    const titleInput = pageAsAdmin.getByLabel('Title');
    const slugInput = pageAsAdmin.getByLabel('Slug');
    const ingredientsInput = pageAsAdmin.getByLabel('Ingredients (one per line)');
    const caloriesInput = pageAsAdmin.getByLabel('Calories');
    const tagsInput = pageAsAdmin.getByLabel('Tags (comma-separated)');

    await expect(titleInput).toHaveAttribute('required', '');
    await expect(slugInput).toHaveAttribute('required', '');
    await expect(ingredientsInput).toHaveAttribute('required', '');
    await expect(caloriesInput).toHaveAttribute('required', '');
    await expect(tagsInput).toHaveAttribute('required', '');
  });
});
