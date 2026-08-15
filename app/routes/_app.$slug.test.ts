import { beforeEach, describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { RouterContextProvider } from "react-router";
import { getDb } from "#/app/db/client.server";
import { drinks } from "#/app/db/schema";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { TEST_ADMIN_USER } from "#/playwright/seed-data";
import { commitSession, getSession, optionalUser } from "#/app/modules/identity/identity.server";
import { loader } from "./_app.$slug";
import type { Route } from "./+types/_app.$slug";

beforeEach(async () => {
  await resetAndSeedDatabase();
});

function createLoaderArgs(
  request: Request,
  context: RouterContextProvider = new RouterContextProvider(),
): Route.LoaderArgs {
  return {
    request,
    url: new URL(request.url),
    params: { slug: "test-margarita" },
    pattern: "/:slug",
    context,
  };
}

async function createAdminCookie() {
  const session = await getSession();
  session.set("user", {
    id: TEST_ADMIN_USER.id,
    email: TEST_ADMIN_USER.email,
    name: TEST_ADMIN_USER.name ?? null,
    avatarUrl: TEST_ADMIN_USER.avatarUrl ?? null,
    role: TEST_ADMIN_USER.role ?? "user",
  });
  return commitSession(session);
}

describe("drink detail route", () => {
  test("returns a published drink page with public cache headers", async () => {
    const loaderArgs = createLoaderArgs(new Request("http://localhost/test-margarita"));
    await optionalUser(loaderArgs, async () => new Response());

    const response = await loader(loaderArgs);
    const headers = getHeaders(response);

    expect(headers.get("Surrogate-Key")).toBe("all test-margarita");
    expect(headers.get("Cache-Control")).toContain("public");
    expect(headers.get("Cache-Control")).toContain("s-maxage=31557600");
  });

  test("returns an unpublished drink page to admins with private cache headers", async () => {
    await getDb()
      .update(drinks)
      .set({ status: "unpublished" })
      .where(eq(drinks.slug, "test-margarita"));

    const cookie = await createAdminCookie();
    const context = new RouterContextProvider();
    const request = new Request("http://localhost/test-margarita", {
      headers: { Cookie: cookie },
    });

    const loaderArgs = createLoaderArgs(request, context);
    await optionalUser(loaderArgs, async () => new Response());

    const response = await loader(loaderArgs);
    const headers = getHeaders(response);

    expect(headers.get("Cache-Control")).toContain("private");
    expect(headers.get("Cache-Control")).toContain("no-store");
  });
});

function getHeaders(response: Response | { init?: ResponseInit | null }) {
  if (response instanceof Response) {
    return response.headers;
  }

  return new Headers(response.init?.headers);
}
