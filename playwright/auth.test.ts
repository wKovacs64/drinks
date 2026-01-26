import { test, expect } from './playwright-utils';

test.describe('Authentication', () => {
  test('unauthenticated user is redirected to login when accessing admin', async ({
    page,
    _resetDb,
  }) => {
    await page.goto('/admin');

    // Should redirect to login
    expect(page.url()).toContain('/login');
  });

  test('authenticated admin can access admin pages', async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto('/admin/drinks');

    // Should see the admin drinks page
    await expect(pageAsAdmin.getByRole('heading', { name: 'Drinks' })).toBeVisible();

    // Should see the user email in header
    await expect(pageAsAdmin.getByText('admin@test.com')).toBeVisible();
  });

  test('admin can logout', async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto('/admin/drinks');

    // Click logout
    await pageAsAdmin.getByRole('button', { name: 'Logout' }).click();

    // Should be redirected to home
    await expect(pageAsAdmin).toHaveURL('/');
  });
});
