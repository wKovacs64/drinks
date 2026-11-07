import type { Handle } from "remix/component";
import type { RenderFunction } from "remix/middleware/render";
import { Document } from "#/app/actions/document.tsx";
import { Icon } from "#/app/ui/icons/public/icon.tsx";

export function SessionExpiredPage(handle: Handle<{ loginHref: string }>) {
  return () => {
    return (
      <Document title="Session Expired | drinks.fyi">
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-200">
          <div className="flex flex-col items-center gap-4">
            <Icon name="mdi-login" size={64} className="text-amber-600" />
            <h1 className="text-2xl font-bold text-zinc-100">Session Expired</h1>
            {/* Google sign-in leaves the origin, which frame navigation cannot follow. */}
            <a
              href={handle.props.loginHref}
              data-rmx-document
              className="mt-2 rounded bg-amber-600 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-500"
            >
              Sign in
            </a>
          </div>
        </div>
      </Document>
    );
  };
}

export function renderSessionExpired(render: RenderFunction, loginHref: string) {
  return render(<SessionExpiredPage loginHref={loginHref} />, { status: 401 });
}
