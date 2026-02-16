import { Link, href } from 'react-router';
import { Icon } from '#/app/icons/icon';

export default function LoginFailed() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-200">
      <title>Login Failed | drinks.fyi</title>
      <div className="flex flex-col items-center gap-4">
        <Icon name="mdi-login" size={64} className="text-amber-600" />

        <h1 className="text-2xl font-bold text-zinc-100">Login Failed</h1>
        <p className="text-zinc-400">Unable to authenticate. Please try again.</p>

        <Link
          to={href('/login')}
          className="mt-2 rounded bg-amber-600 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-500"
        >
          Try again
        </Link>
      </div>
    </div>
  );
}
