import { routes } from "#/app/routes.ts";
import type { Handle } from "remix/component";
import { Link, type LinkProps } from "#/app/ui/navigation/public/link.tsx";
import { Icon } from "#/app/ui/icons/public/icon.tsx";

export function Header() {
  return () => {
    return (
      <header className="bg-dreamless-sleep flex flex-col items-center p-4 text-stone-300 md:p-8">
        <section className="flex w-full flex-wrap items-center justify-between sm:w-104 lg:w-full lg:max-w-240 xl:max-w-7xl">
          {/* TODO: change to h2 or something, move h1 to interesting page content */}
          <h1 className="text-3xl font-light">
            <HeaderLink to={routes.home.href()}>drinks.fyi</HeaderLink>
          </h1>
          <HeaderLink to={routes.search.index.href()}>
            <span className="sr-only">Search</span>
            <Icon name="ic-baseline-search" aria-hidden size={32} />
          </HeaderLink>
        </section>
      </header>
    );
  };
}

function HeaderLink(handle: Handle<LinkProps>) {
  return () => {
    const { children, ...props } = handle.props;
    return (
      <Link {...props} className="drinks-focusable hover:text-zinc-100 focus:text-zinc-100">
        {children}
      </Link>
    );
  };
}
