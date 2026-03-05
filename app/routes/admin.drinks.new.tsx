import { redirect, href, data } from "react-router";
import { getSession, commitSession } from "#/app/modules/auth";
import { createDrink, drinkFormSchema, parseImageUpload, DrinkForm } from "#/app/modules/drinks";
import type { Route } from "./+types/admin.drinks.new";

export default function NewDrinkPage({ actionData }: Route.ComponentProps) {
  return (
    <div>
      <title>New Drink | drinks.fyi</title>
      <h1 className="mb-6 text-2xl font-medium text-zinc-200">Add New Drink</h1>
      <DrinkForm action={href("/admin/drinks/new")} errors={actionData?.errors} />
    </div>
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { formData, imageUpload, imageError } = await parseImageUpload(request);

  if (imageError) {
    return data({ errors: [imageError] }, { status: 400 });
  }

  const result = drinkFormSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return data({ errors: result.error.issues.map((issue) => issue.message) }, { status: 400 });
  }

  if (!imageUpload) {
    return data({ errors: ["Image is required"] }, { status: 400 });
  }

  await createDrink(result.data, imageUpload);

  const session = await getSession(request.headers.get("Cookie"));
  session.flash("toast", { kind: "success" as const, message: `${result.data.title} created!` });
  return redirect(href("/admin/drinks"), {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
