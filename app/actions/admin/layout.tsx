import { routes } from "#/app/routes.ts";
import type { Handle, RemixNode } from "remix/component";
import type { SessionUser } from "#/app/modules/identity/identity.ts";
import type { ToastMessage } from "#/app/core/toast.ts";
import { Toast } from "#/app/actions/admin/public/toast.tsx";
export function AdminLayout(
  handle: Handle<{ user: SessionUser; children: RemixNode; toast?: ToastMessage }>,
) {
  return () => (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-1">
            <a href={routes.home.href()} className="text-zinc-400 hover:text-white">
              drinks.fyi
            </a>
            <span className="text-zinc-600">/</span>
            <a href={routes.admin.index.href()} className="text-zinc-600 hover:text-zinc-400">
              admin
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400">{handle.props.user.email}</span>
            <form method="post" action={routes.auth.logout.href()}>
              <button type="submit" className="text-zinc-500 hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{handle.props.children}</main>
      {handle.props.toast ? (
        <Toast {...handle.props.toast} notificationId={crypto.randomUUID()} />
      ) : null}
    </div>
  );
}
