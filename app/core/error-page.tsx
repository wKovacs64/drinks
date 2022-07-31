import type { useCatch } from '@remix-run/react';

export default function ErrorPage({
  caught,
}: {
  caught: ReturnType<typeof useCatch>;
}) {
  return (
    <div className="flex flex-col gap-4 text-white">
      <h1>Caught</h1>
      <p>Status: {caught.status}</p>
      <pre>
        <code>{JSON.stringify(caught.data, null, 2)}</code>
      </pre>
    </div>
  );
}
