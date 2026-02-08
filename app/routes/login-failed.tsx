import { Link, href } from 'react-router';

export default function LoginFailed() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Login Failed</h1>
      <p className="mt-2 text-gray-600">Unable to authenticate. Please try again.</p>
      <Link to={href('/login')} className="mt-4 text-blue-600 hover:underline">
        Try again
      </Link>
    </div>
  );
}
