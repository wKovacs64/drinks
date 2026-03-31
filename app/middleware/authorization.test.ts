import { beforeEach, describe, expect, test } from "vitest";
import type { RouterContextProvider } from "react-router";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { commitSession, getSession } from "#/app/auth/session.server";
import {
  optionalUserMiddleware,
  getOptionalUserFromContext,
} from "#/app/middleware/authorization.server";
import { TEST_ADMIN_USER } from "#/playwright/seed-data";
import type { AuthenticatedUser } from "#/app/auth/types";

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

describe("optionalUserMiddleware", () => {
  test("sets user in context when valid session exists", async () => {
    const cookie = await createSessionCookie({
      id: TEST_ADMIN_USER.id,
      email: TEST_ADMIN_USER.email,
      name: TEST_ADMIN_USER.name!,
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

    await optionalUserMiddleware({ request, context } as never, next);

    expect(nextCalled).toBe(true);
    const user = getOptionalUserFromContext(context);
    expect(user).toBeDefined();
    expect(user!.id).toBe(TEST_ADMIN_USER.id);
    expect(user!.role).toBe("admin");
  });

  test("calls next without setting user when no session", async () => {
    const request = new Request("http://localhost/test");
    const context = createMockContext();
    let nextCalled = false;
    const next = async () => {
      nextCalled = true;
      return new Response();
    };

    await optionalUserMiddleware({ request, context } as never, next);

    expect(nextCalled).toBe(true);
    expect(getOptionalUserFromContext(context)).toBeUndefined();
  });

  test("calls next without setting user when user no longer exists in db", async () => {
    const cookie = await createSessionCookie({
      id: "nonexistent-user-id",
      email: "ghost@test.com",
      name: "Ghost",
      avatarUrl: null,
      role: "admin",
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

    await optionalUserMiddleware({ request, context } as never, next);

    expect(nextCalled).toBe(true);
    expect(getOptionalUserFromContext(context)).toBeUndefined();
  });
});
