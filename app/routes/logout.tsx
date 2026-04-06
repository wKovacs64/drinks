import { redirect, href } from "react-router";
import { logout } from "#/app/modules/identity/identity.server";
import type { Route } from "./+types/logout";

export async function loader() {
  throw redirect(href("/"));
}

export async function action({ request }: Route.ActionArgs) {
  throw await logout(request);
}
