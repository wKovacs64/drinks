import { beforeEach, describe, expect, test } from "vitest";
import type { RouterContextProvider } from "react-router";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { TEST_ADMIN_USER } from "#/playwright/seed-data";
import { getOptionalUserFromContext } from "./identity-context.server";
import { optionalUser } from "./identity-middleware.server";
import { commitSession, getSession } from "./identity-session.server";
import type { AuthenticatedUser } from "./identity";

beforeEach(async () => {
  await resetAndSeedDatabase();
});

function createMockContext(): RouterContextProvider {
  const map = new Map<unknown, unknown>();
  return {
    get: (key: unknown) => map.get(key),
    set: (key: unknown, value: unknown) => map.set(key, value),
  } as unknown as RouterContextProvider;
}

async function createSessionCookie(user: AuthenticatedUser): Promise<string> {
  const session = await getSession();
  session.set("user", user);
  return commitSession(session);
}

describe("optionalUser", () => {
  test("sets user in context when valid session exists", async () => {
    const cookie = await createSessionCookie({
      id: TEST_ADMIN_USER.id,
      email: TEST_ADMIN_USER.email,
      name: TEST_ADMIN_USER.name ?? null,
      avatarUrl: TEST_ADMIN_USER.avatarUrl ?? null,
      role: TEST_ADMIN_USER.role ?? "user",
    });

    const request = new Request("http://localhost/test", {
      headers: { Cookie: cookie },
    });

    const context = createMockContext();
    let nextCalled = false;
    const next = async () => {
      nextCalled = true;
      return new Response();
    };

    await optionalUser({ request, context } as never, next);

    expect(nextCalled).toBe(true);
    const user = getOptionalUserFromContext(context);
    expect(user).toBeDefined();
    expect(user?.id).toBe(TEST_ADMIN_USER.id);
    expect(user?.role).toBe("admin");
  });
});
