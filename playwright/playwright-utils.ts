import { test as base, expect, type Page } from '@playwright/test';
import { getRawSessionCookieValue, sessionCookie } from '#/app/auth/session.server';
import { MOCK_ADMIN } from './mock-users';

type TestFixtures = {
  _resetDb: void;
  pageAsAdmin: Page;
};

async function resetDatabase(request: Page['request']) {
  const response = await request.post('/_/reset-db');
  if (!response.ok()) {
    throw new Error(`Failed to reset database: ${response.status()}`);
  }
}

export const test = base.extend<TestFixtures>({
  _resetDb: async ({ request }, use) => {
    await resetDatabase(request);
    await use();
  },

  pageAsAdmin: async ({ page, context, request }, use) => {
    // Reset database before each test
    await resetDatabase(request);

    // Inject admin session cookie
    await context.addCookies([
      {
        name: sessionCookie.name,
        value: await getRawSessionCookieValue(MOCK_ADMIN),
        domain: 'localhost',
        httpOnly: true,
        path: '/',
        sameSite: 'Lax',
        secure: false,
      },
    ]);

    await use(page);
    await context.clearCookies();
  },
});

export { expect };
