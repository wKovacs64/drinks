import { test, expect } from './playwright-utils';

test.describe('Authentication', () => {
  test('unauthenticated user is redirected to login when accessing admin', async ({
    page,
    _resetDb,
  }) => {
    // Check that the first redirect goes to /login (before OAuth redirect)
    const response = await page.goto('/admin', { waitUntil: 'commit' });

    // The middleware should redirect to /login
    const requestUrl = new URL(response?.url() ?? '');

    // Either we're at /login or redirecting to Google OAuth (which means we went through /login)
    const wentThroughLogin = requestUrl.pathname === '/login' || requestUrl.host.includes('google');
    expect(wentThroughLogin).toBe(true);
  });

  test('authenticated admin can access admin pages', async ({ pageAsAdmin }) => {
    await pageAsAdmin.goto('/admin/drinks');

    // Should see the admin drinks page
    await expect(pageAsAdmin.getByRole('heading', { name: 'Drinks', exact: true })).toBeVisible();

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
