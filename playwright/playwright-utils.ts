import { test as base, expect, type Page } from '@playwright/test';

// Will be extended with pageAsAdmin fixture after auth is implemented (Task 25)

async function resetDatabase(request: Page['request']) {
  const response = await request.post('/_/reset-db');
  if (!response.ok()) {
    throw new Error(`Failed to reset database: ${response.status()}`);
  }
}

export const test = base.extend<{ resetDb: void }>({
  resetDb: async ({ request }, use) => {
    await resetDatabase(request);
    await use();
  },
});

export { expect };
