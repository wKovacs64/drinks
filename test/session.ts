import { createRouter } from "remix/router";
import { SetCookie } from "remix/headers/set-cookie";
import { getIdentitySessionMiddleware, type SessionUser } from "#/app/modules/identity/identity.ts";

// Signs in as any user id through the identity session middleware's own Set-Cookie.
export async function getSessionCookieValue(userId: SessionUser["id"]): Promise<string> {
  const router = createRouter({ middleware: [getIdentitySessionMiddleware()] });
  router.get("/", (context) => {
    context.session.set("userId", userId);
    return new Response();
  });
  const response = await router.fetch(new Request("http://localhost/"));
  const setCookieHeader = response.headers.get("set-cookie");
  if (setCookieHeader === null) throw new Error("Expected the session middleware to set a cookie");
  const { value } = new SetCookie(setCookieHeader);
  if (value === undefined) throw new Error("Expected a signed session cookie value");
  return value;
}
