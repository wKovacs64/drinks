import { redirect, data, href } from "react-router";
import { invariantResponse } from "@epic-web/invariant";
import { getDrinkBySlug } from "#/app/models/drink.server";
import { deleteDrink } from "#/app/drinks/mutations.server";
import { getSession, commitSession } from "#/app/auth/session.server";
import type { Route } from "./+types/admin.drinks.$slug.delete";

export async function loader() {
  return redirect(href("/admin/drinks"));
}

export async function action({ request, params }: Route.ActionArgs) {
  const drink = await getDrinkBySlug(params.slug);
  invariantResponse(drink, "Drink not found", { status: 404 });

  const session = await getSession(request.headers.get("Cookie"));

  try {
    await deleteDrink(drink);
  } catch {
    session.flash("toast", {
      kind: "error" as const,
      message: `Failed to delete ${drink.title} — please try again`,
    });
    return data(null, {
      status: 500,
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }

  session.flash("toast", { kind: "success" as const, message: `${drink.title} deleted!` });
  return redirect(href("/admin/drinks"), {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
