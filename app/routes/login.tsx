import { initiateLogin } from "#/app/modules/identity/identity.server";
import type { Route } from "./+types/login";

export async function loader({ request }: Route.LoaderArgs) {
  throw await initiateLogin(request);
}
