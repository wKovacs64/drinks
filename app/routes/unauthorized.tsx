import { Link, href } from 'react-router';

export function meta() {
  return [{ title: 'Unauthorized | drinks.fyi' }];
}

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-200">
      <div className="flex flex-col items-center gap-4">
        {/* Shield lock icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-16 w-16 text-amber-600"
        >
          <path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z" />
          <rect x="10" y="10" width="4" height="5" rx="1" />
          <path d="M12 10V8a1.5 1.5 0 0 0-1.5-1.5h0A1.5 1.5 0 0 0 9 8v2" />
        </svg>

        <h1 className="text-2xl font-bold text-zinc-100">Unauthorized</h1>
        <p className="text-zinc-400">You do not have permission to access this page.</p>

        <Link
          to={href('/')}
          className="mt-2 rounded bg-amber-600 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-500"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
