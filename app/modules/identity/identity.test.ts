import "#/test/setup.ts";
import { beforeEach, describe, test } from "remix/test";
import { expect } from "remix/assert";
import { getDb } from "#/app/db/client.ts";
import { users, writeUser } from "#/app/db/schema.ts";
import { resetAndSeedDatabase } from "#/test/database.ts";
import { createIdentityService, safeRedirectTo } from "./identity.ts";

describe("createIdentityService", () => {
  beforeEach(resetAndSeedDatabase);

  for (const rejectedProfile of [
    { reason: "a missing email", email: undefined, emailVerified: true },
    { reason: "an empty email", email: "", emailVerified: true },
    { reason: "an unverified email", email: "admin@test.com", emailVerified: false },
    { reason: "missing email verification", email: "admin@test.com", emailVerified: undefined },
    { reason: "an unknown email", email: "unknown@test.com", emailVerified: true },
  ]) {
    test(`rejects ${rejectedProfile.reason} without writing or creating a User`, async () => {
      const db = getDb();
      const service = createIdentityService({ db });
      await db.update(users, "test-admin-id", { updated_at: 1 });
      const existingUsers = await db.findMany(users);

      const user = await service.admitUser({
        email: rejectedProfile.email,
        emailVerified: rejectedProfile.emailVerified,
        name: "Rejected Name",
        avatarUrl: "https://example.com/rejected.png",
      });

      expect(user).toBeNull();
      // Include timestamps and every User to verify rejection makes no persistence changes.
      expect(await db.findMany(users)).toEqual(existingUsers);
    });
  }

  test("admits a verified existing User and refreshes only their profile", async () => {
    const service = createIdentityService({ db: getDb() });

    const user = await service.admitUser({
      email: "admin@test.com",
      emailVerified: true,
      name: "Current Admin",
      avatarUrl: "https://example.com/current.png",
    });

    expect(user).toEqual({
      id: "test-admin-id",
      email: "admin@test.com",
      name: "Current Admin",
      avatarUrl: "https://example.com/current.png",
      role: "admin",
    });
    expect(await service.getSessionUser({ userId: "test-admin-id" })).toEqual(user);
  });

  test("clears missing profile fields without changing a regular User's access", async () => {
    const db = getDb();
    await db.create(
      users,
      writeUser({
        id: "test-user-id",
        email: "user@test.com",
        name: "Previous Name",
        avatarUrl: "https://example.com/previous.png",
        role: "user",
      }),
    );
    const service = createIdentityService({ db });

    const user = await service.admitUser({
      email: "user@test.com",
      emailVerified: true,
      name: undefined,
      avatarUrl: undefined,
    });

    expect(user).toEqual({
      id: "test-user-id",
      email: "user@test.com",
      name: null,
      avatarUrl: null,
      role: "user",
    });
    expect(await service.getSessionUser({ userId: "test-user-id" })).toEqual(user);
  });

  test("resolves the current User role on each lookup", async () => {
    const db = getDb();
    const service = createIdentityService({ db });

    expect(await service.getSessionUser({ userId: "test-admin-id" })).toEqual({
      id: "test-admin-id",
      email: "admin@test.com",
      name: "Test Admin",
      avatarUrl: null,
      role: "admin",
    });

    await db.update(users, "test-admin-id", { role: "user" });

    expect((await service.getSessionUser({ userId: "test-admin-id" }))?.role).toBe("user");

    await db.update(users, "test-admin-id", { role: "admin" });

    expect((await service.getSessionUser({ userId: "test-admin-id" }))?.role).toBe("admin");
  });

  test("returns null on the next lookup after a User is deleted", async () => {
    const db = getDb();
    const service = createIdentityService({ db });

    expect((await service.getSessionUser({ userId: "test-admin-id" }))?.id).toBe("test-admin-id");

    await db.delete(users, "test-admin-id");

    expect(await service.getSessionUser({ userId: "test-admin-id" })).toBeNull();
  });
});

describe("safeRedirectTo", () => {
  test("returns the path for a valid relative URL", () => {
    expect(safeRedirectTo("/admin")).toBe("/admin");
  });

  test("uses the configured fallback for missing or unsafe return destinations", () => {
    for (const destination of [null, undefined, "https://evil.com", "//evil.com"]) {
      expect(safeRedirectTo(destination)).toBe("/");
      expect(safeRedirectTo(destination, "/home")).toBe("/home");
    }
  });
});
