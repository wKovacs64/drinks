import { redirect, href, data } from "react-router";
import { invariantResponse } from "@epic-web/invariant";
import { getDrinkBySlug } from "#/app/models/drink.server";
import { getSession, commitSession } from "#/app/auth/session.server";
import { updateDrink } from "#/app/drinks/mutations.server";
import { parseImageUpload } from "#/app/utils/parse-image-upload.server";
import { DrinkForm } from "#/app/admin/drink-form";
import { drinkFormSchema } from "#/app/validation/drink";
import type { Route } from "./+types/admin.drinks.$slug.edit";

export async function loader({ params }: Route.LoaderArgs) {
  const drink = await getDrinkBySlug(params.slug);
  invariantResponse(drink, "Drink not found", { status: 404 });
  return { drink };
}

export default function EditDrinkPage({ loaderData, actionData }: Route.ComponentProps) {
  const { drink } = loaderData;

  return (
    <div>
      <title>{`Edit ${drink.title} | drinks.fyi`}</title>
      <h1 className="mb-6 text-2xl font-medium text-zinc-200">Edit Drink</h1>
      <DrinkForm
        drink={drink}
        action={href("/admin/drinks/:slug/edit", { slug: drink.slug })}
        errors={actionData?.errors}
      />
    </div>
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const drink = await getDrinkBySlug(params.slug);
  invariantResponse(drink, "Drink not found", { status: 404 });

  const { formData, imageUpload, imageError } = await parseImageUpload(request);

  if (imageError) {
    return data({ errors: [imageError] }, { status: 400 });
  }

  const result = drinkFormSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return data({ errors: result.error.issues.map((issue) => issue.message) }, { status: 400 });
  }

  const { staleImageError } = await updateDrink(drink, result.data, imageUpload);

  const session = await getSession(request.headers.get("Cookie"));

  if (staleImageError) {
    session.flash("toast", {
      kind: "error" as const,
      message: `${result.data.title} updated, but old image cleanup failed`,
    });
  } else {
    session.flash("toast", {
      kind: "success" as const,
      message: `${result.data.title} updated!`,
    });
  }

  return redirect(href("/admin/drinks"), {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
