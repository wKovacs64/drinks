import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { NotFound } from './not-found';

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <NotFound />;
    }

    return (
      <BoundaryContainer>
        <h1>
          <span>
            {error.status} {error.statusText}
          </span>
        </h1>
        <section className="flex flex-col gap-4">
          <p>We knew this might happen one day.</p>
          {error.data ? <p>The error message was as follows:</p> : null}
        </section>
        {error.data ? <BoundaryError>{JSON.stringify(error.data, null, 2)}</BoundaryError> : null}
        <StartOverLink />
      </BoundaryContainer>
    );
  }

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
        <p>Something unexpected happened and we were not prepared. Sorry about that.</p>
        <p>The error message was as follows:</p>
      </section>
      <BoundaryError>{error instanceof Error ? error.message : 'Unknown Error'}</BoundaryError>
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
      className="drinks-focusable border-b border-solid pb-1 hover:shadow-[inset_0_-2px_0_0] focus-visible:shadow-[inset_0_-2px_0_0] md:text-xl"
      reloadDocument
    >
      Try Starting Over
    </Link>
  );
}
