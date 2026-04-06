import { useEffect } from "react";
import { Outlet, Link, Form, href, data } from "react-router";
import { Toaster, toast } from "sonner";
import { getToast } from "#/app/core/toast.server";
import {
  getUserFromContext,
  requireRole,
  requireUser,
} from "#/app/modules/identity/identity.server";
import type { Route } from "./+types/admin";

export const middleware = [requireUser, requireRole(["admin"])];

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = getUserFromContext(context);
  const { toast: toastData, headers } = await getToast(request);
  return data(
    { user, toast: toastData ? { ...toastData, timestamp: Date.now() } : undefined },
    { headers },
  );
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { user, toast: toastData } = loaderData;

  useEffect(() => {
    if (!toastData) return;
    switch (toastData.kind) {
      case "success":
        toast.success(toastData.message);
        break;
      case "warning":
        toast.warning(toastData.message);
        break;
      case "error":
        toast.error(toastData.message);
        break;
    }
  }, [toastData]);

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-1">
            <Link to={href("/")} className="text-zinc-400 hover:text-white">
              drinks.fyi
            </Link>
            <span className="text-zinc-600">/</span>
            <Link to={href("/admin")} className="text-zinc-600 hover:text-zinc-400">
              admin
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400">{user.email}</span>
            <Form method="post" action={href("/logout")}>
              <button type="submit" className="text-zinc-500 hover:text-white">
                Sign out
              </button>
            </Form>
          </div>
        </div>
      </header>
      <title>Admin | drinks.fyi</title>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
      <Toaster toastOptions={{ className: "text-sm! sm:w-auto!" }} richColors />
    </div>
  );
}
