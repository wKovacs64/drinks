import { Link, useCatch } from '@remix-run/react';
import NotFound from '~/core/not-found';

export function CatchBoundary() {
  const caught = useCatch();
  const hasErrorData = Boolean(caught.data);

  return caught.status === 404 ? (
    <NotFound />
  ) : (
    <BoundaryContainer>
      <h1>
        <span>
          {caught.status} {caught.statusText}
        </span>
      </h1>
      <section className="flex flex-col gap-4">
        <p>We knew this might happen one day.</p>
        {hasErrorData ? <p>The error message was as follows:</p> : null}
      </section>
      {hasErrorData ? (
        <BoundaryError>{JSON.stringify(caught.data, null, 2)}</BoundaryError>
      ) : null}
      <StartOverLink />
    </BoundaryContainer>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <BoundaryContainer>
      <h1 className="flex gap-2">
        <span role="img" aria-hidden>
          💥
        </span>
        <span>Unhandled Exception</span>
        <span role="img" aria-hidden>
          💥
        </span>
      </h1>
      <section className="flex flex-col gap-4">
        <p>
          Something unexpected happened and we were not prepared. Sorry about
          that.
        </p>
        <p>The error message was as follows:</p>
      </section>
      <BoundaryError>{error.message}</BoundaryError>
      <StartOverLink />
    </BoundaryContainer>
  );
}

function BoundaryContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-8 px-4 text-xl text-white md:gap-16 md:text-2xl lg:text-4xl">
      {children}
    </div>
  );
}

function BoundaryError({ children }: { children: React.ReactNode }) {
  return (
    <pre className="w-full bg-stone-900 p-8">
      <code className="align-middle text-xl">{children}</code>
    </pre>
  );
}

function StartOverLink() {
  return (
    <Link
      to="/"
      className="border-b border-solid pb-1 transition-shadow ease-default hover:shadow-[inset_0_-2px_0_0] focus-visible:shadow-[inset_0_-2px_0_0] focus-visible:outline-none focus-visible:ring md:text-xl"
      reloadDocument
    >
      Try Starting Over
    </Link>
  );
}
