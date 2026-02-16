import { Icon } from '#/app/icons/icon';

export function Footer() {
  return (
    <footer className="bg-dreamless-sleep flex flex-col items-center p-4 text-stone-300 md:p-8">
      <section className="flex w-full flex-wrap items-center justify-between sm:w-104 lg:w-full lg:max-w-240 xl:max-w-7xl">
        {/* TODO: reimplement or remove the feedback form */}
        {/* <button
          type="button"
          onClick={onFeedbackClick}
          className="drinks-focusable inline-block whitespace-nowrap border border-solid border-current p-2 hover:border-zinc-100 hover:text-zinc-100 focus:border-zinc-100 focus:text-zinc-100 md:p-4"
        >
          Send Feedback
        </button> */}
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
}
