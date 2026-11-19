import { Icon } from "#/app/ui/icons/public/icon.tsx";

export function Footer() {
  return () => {
    return (
      <footer className="bg-dreamless-sleep flex flex-col items-center p-4 text-stone-300 md:p-8">
        <section className="flex w-full flex-wrap items-center justify-between sm:w-104 lg:w-full lg:max-w-240 xl:max-w-7xl">
          {/* TODO: reimplement or remove the feedback form */}
          <div />
          <a
            className="drinks-focusable hover:text-zinc-100 focus:text-zinc-100"
            href="https://github.com/wKovacs64/drinks"
            target="_blank"
            rel="nofollow noopener noreferrer"
          >
            <Icon name="github" aria-label="View source on GitHub" size={32} />
          </a>
        </section>
      </footer>
    );
  };
}
