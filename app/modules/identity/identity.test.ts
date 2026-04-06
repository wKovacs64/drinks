import { beforeEach, describe, expect, test } from "vitest";
import { getDb } from "#/app/db/client.server";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { TEST_ADMIN_USER } from "#/playwright/seed-data";
import { createIdentityService } from "./identity.server";

beforeEach(async () => {
  await resetAndSeedDatabase();
});

describe("createIdentityService", () => {
  test("loads a session user for an existing user", async () => {
    const service = createIdentityService({ db: getDb() });

    const sessionUser = await service.getSessionUser({ userId: TEST_ADMIN_USER.id });

    expect(sessionUser).toEqual({
      id: TEST_ADMIN_USER.id,
      email: TEST_ADMIN_USER.email,
      name: TEST_ADMIN_USER.name,
      avatarUrl: TEST_ADMIN_USER.avatarUrl,
      role: TEST_ADMIN_USER.role,
    });
  });
});
