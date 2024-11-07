import { Link, type LinkProps } from '@remix-run/react';
import { Icon } from '~/icons/icon';

export function Header() {
  return (
    <header className="flex flex-col items-center bg-[#111111] p-4 text-stone-300 md:p-8">
      <section className="flex w-full flex-wrap items-center justify-between sm:w-[26rem] lg:w-full lg:max-w-[60rem] xl:max-w-[80rem]">
        {/* TODO: change to h2 or something, move h1 to interesting page content */}
        <h1 className="text-3xl font-light">
          <HeaderLink to="/">drinks.fyi</HeaderLink>
        </h1>
        <HeaderLink to="/search">
          <span className="sr-only">Search</span>
          <Icon name="search-filled" aria-hidden size={32} />
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
