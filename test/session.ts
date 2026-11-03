import { SetCookie } from "remix/headers/set-cookie";
import type { User } from "#/app/db/schema.ts";
import {
  createIdentitySessionCookie,
  createIdentitySessionStorage,
} from "#/app/modules/identity/identity.ts";

// Signs in as any user id by signing the same envelope the identity session middleware reads.
export async function getSessionCookieValue(userId: User["id"]): Promise<string> {
  const storage = createIdentitySessionStorage();
  const session = await storage.read(null);
  session.set("userId", userId);
  const storageValue = await storage.save(session);
  if (storageValue === null) throw new Error("Expected session storage to return a cookie value");
  const { value } = new SetCookie(await createIdentitySessionCookie().serialize(storageValue));
  if (value === undefined) throw new Error("Expected a signed session cookie value");
  return value;
}
