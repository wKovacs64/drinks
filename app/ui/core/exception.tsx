import type { Handle } from "remix/component";

export function Exception(handle: Handle<{ message: string }>) {
  return () => (
    <div className="flex flex-1 flex-col items-center gap-8 bg-neutral-800 bg-[url('./images/background-768.jpg')] bg-cover bg-fixed bg-center bg-no-repeat px-4 pt-8 text-gray-100 md:gap-16 md:pt-24 lg:bg-[url('./images/background-2078.jpg')]">
      <h1 className="flex gap-4 text-4xl font-normal">
        <span role="img" aria-hidden>
          💥
        </span>
        Unhandled Exception
        <span role="img" aria-hidden>
          💥
        </span>
      </h1>
      <section className="flex flex-col gap-4 text-xl">
        <p>Something unexpected happened and we were not prepared. Sorry about that.</p>
        <p>The error message was as follows:</p>
      </section>
      <pre className="w-full max-w-7xl bg-stone-900 p-12 whitespace-pre-wrap">
        <code className="text-base">{handle.props.message}</code>
      </pre>
      <a
        href="/"
        className="drinks-focusable border-b border-solid pb-1 hover:shadow-[inset_0_-2px_0_0] focus-visible:shadow-[inset_0_-2px_0_0] md:text-xl"
      >
        Try Starting Over
      </a>
    </div>
  );
}
