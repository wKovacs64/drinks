import { Outlet, Link, Form, href } from 'react-router';
import { userMiddleware, adminMiddleware, getUserFromContext } from '#/app/middleware/auth.server';
import type { Route } from './+types/admin';

export const middleware = [userMiddleware, adminMiddleware];

export async function loader({ context }: Route.LoaderArgs) {
  const user = getUserFromContext(context);
  return { user };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <div className="min-h-screen bg-zinc-950" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-1 text-sm">
            <Link to={href('/')} className="text-zinc-400 hover:text-white">
              drinks.fyi
            </Link>
            <span className="text-zinc-600">/</span>
            <Link to={href('/admin')} className="text-zinc-600 hover:text-zinc-400">
              admin
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-400">{user.email}</span>
            <Form method="post" action="/logout">
              <button type="submit" className="text-zinc-500 hover:text-white">
                Sign out
              </button>
            </Form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
