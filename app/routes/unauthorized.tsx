import { Link } from 'react-router';

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Unauthorized</h1>
      <p className="mt-2 text-gray-600">You do not have permission to access this page.</p>
      <Link to="/" className="mt-4 text-blue-600 hover:underline">
        Go home
      </Link>
    </div>
  );
}
