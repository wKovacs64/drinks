import { Link, href, type LinkProps } from 'react-router';
import { Icon } from '#/app/icons/icon';

export function Header() {
  return (
    <header className="bg-dreamless-sleep flex flex-col items-center p-4 text-stone-300 md:p-8">
      <section className="flex w-full flex-wrap items-center justify-between sm:w-104 lg:w-full lg:max-w-240 xl:max-w-7xl">
        {/* TODO: change to h2 or something, move h1 to interesting page content */}
        <h1 className="text-3xl font-light">
          <HeaderLink to={href('/')}>drinks.fyi</HeaderLink>
        </h1>
        <HeaderLink to={href('/search')}>
          <span className="sr-only">Search</span>
          <Icon name="ic-baseline-search" aria-hidden size={32} />
        </HeaderLink>
      </section>
    </header>
  );
}

function HeaderLink({ children, ...props }: LinkProps) {
  return (
    <Link {...props} className="drinks-focusable hover:text-zinc-100 focus:text-zinc-100">
      {children}
    </Link>
  );
}
