import { Link, href, isRouteErrorResponse, useRouteError } from 'react-router';
import { backgroundImageStyles } from '#/app/styles/background-image';
import type { GuardType } from '#/app/types';
import { NotFound } from './not-found';

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <NotFound />;
    }

    return (
      <BoundaryContainer>
        <BoundaryTitle>
          {error.status} {error.statusText}
        </BoundaryTitle>
        <section className="flex flex-col gap-4 text-xl">
          <p>We knew this might happen one day.</p>
          {error.data ? <p>The error message was as follows:</p> : null}
        </section>
        {error.data ? <BoundaryError>{renderRouteErrorData(error.data)}</BoundaryError> : null}
        <StartOverLink />
      </BoundaryContainer>
    );
  }

  return (
    <BoundaryContainer>
      <BoundaryTitle emoji="💥">Unhandled Exception</BoundaryTitle>
      <section className="flex flex-col gap-4 text-xl">
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
    <div className="bg-app-image flex flex-1 flex-col items-center gap-8 bg-neutral-800 bg-cover bg-fixed bg-center bg-no-repeat px-4 pt-8 text-gray-100 md:gap-16 md:pt-24">
      <style dangerouslySetInnerHTML={{ __html: backgroundImageStyles }} />
      {children}
    </div>
  );
}

function BoundaryTitle({ emoji, children }: { emoji?: string; children: React.ReactNode }) {
  return (
    <h1 className="flex gap-4 text-4xl font-normal">
      {emoji ? (
        <span role="img" aria-hidden>
          {emoji}
        </span>
      ) : null}
      {children}
      {emoji ? (
        <span role="img" aria-hidden>
          {emoji}
        </span>
      ) : null}
    </h1>
  );
}

function BoundaryError({ children }: { children: React.ReactNode }) {
  return (
    <pre className="w-full max-w-7xl bg-stone-900 p-12 whitespace-pre-wrap">
      <code className="text-base">{children}</code>
    </pre>
  );
}

function StartOverLink() {
  return (
    <Link
      to={href('/')}
      className="drinks-focusable border-b border-solid pb-1 hover:shadow-[inset_0_-2px_0_0] focus-visible:shadow-[inset_0_-2px_0_0] md:text-xl"
      reloadDocument
    >
      Try Starting Over
    </Link>
  );
}

function renderRouteErrorData(routeErrorData: GuardType<typeof isRouteErrorResponse>['data']) {
  if (typeof routeErrorData === 'object') {
    return JSON.stringify(routeErrorData, null, 2);
  }

  return String(routeErrorData);
}
