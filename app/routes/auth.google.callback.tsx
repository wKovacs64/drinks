import { authenticate } from "#/app/modules/identity/identity.server";
import type { Route } from "./+types/auth.google.callback";

export async function loader({ request }: Route.LoaderArgs) {
  throw await authenticate(request);
}
