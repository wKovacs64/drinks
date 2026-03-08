import { redirect } from "react-router";
import { authenticator, getSession, safeRedirectTo } from "#/app/modules/auth/index.server";
import type { Route } from "./+types/login";

export async function loader({ request }: Route.LoaderArgs) {
  await authenticator.authenticate("google", request);
  const session = await getSession(request.headers.get("Cookie"));
  throw redirect(safeRedirectTo(session.get("returnTo")));
}
