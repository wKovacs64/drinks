import { useLoaderData } from '@remix-run/react';
import type { HeadersFunction } from '@remix-run/node';
import { cacheHeader } from 'pretty-cache-header';
import DrinkList from '~/drinks/drink-list';
import { loader } from './loader.server';

export const headers: HeadersFunction = () => {
  return {
    'Cache-Control': cacheHeader({
      maxAge: '10min',
      sMaxage: '1day',
      staleWhileRevalidate: '1week',
    }),
  };
};

export { loader };

export default function HomePage() {
  const { drinks } = useLoaderData<typeof loader>();

  return <DrinkList drinks={drinks} />;
}
