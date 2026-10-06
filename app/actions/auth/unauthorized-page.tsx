import { routes } from "#/app/routes.ts";
import { Document } from "#/app/actions/document.tsx";
import { Icon } from "#/app/ui/icons/public/icon.tsx";

export function UnauthorizedPage() {
  return () => {
    return (
      <Document title="Unauthorized | drinks.fyi">
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-200">
          <div className="flex flex-col items-center gap-4">
            <Icon name="mdi-shield-lock-outline" size={64} className="text-amber-600" />
            <h1 className="text-2xl font-bold text-zinc-100">Unauthorized</h1>
            <p className="text-zinc-400">You do not have permission to access this page.</p>
            <a
              href={routes.home.href()}
              className="mt-2 rounded bg-amber-600 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-500"
            >
              Go home
            </a>
          </div>
        </div>
      </Document>
    );
  };
}
