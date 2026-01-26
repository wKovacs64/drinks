import { Outlet, Link, Form } from 'react-router';
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              View Site
            </Link>
            <span className="text-gray-300">|</span>
            <Link to="/admin/drinks" className="font-semibold text-gray-900">
              Drinks Admin
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <Form method="post" action="/logout">
              <button type="submit" className="text-sm text-gray-600 hover:text-gray-900">
                Logout
              </button>
            </Form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
