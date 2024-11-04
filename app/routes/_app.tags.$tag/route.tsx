import { useLoaderData } from '@remix-run/react';
import { lowerCase, startCase } from 'lodash-es';
import type { HeadersFunction } from '@remix-run/node';
import { cacheHeader } from 'pretty-cache-header';
import { mergeMeta } from '~/utils/meta';
import { notFoundMeta } from '~/routes/_app.$';
import { getLoaderDataForHandle } from '~/navigation/breadcrumbs';
import DrinkList from '~/drinks/drink-list';
import type { AppRouteHandle } from '~/types';
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

export const handle: AppRouteHandle = {
  breadcrumb: (matches) => {
    const data = getLoaderDataForHandle<typeof loader>('routes/_app.tags.$tag', matches);
    return {
      title: data ? (
        <div className="inline-flex gap-2">
          <span>{lowerCase(matches.at(-1)?.params.tag)}</span>
          <span>( {data.drinks.length} )</span>
        </div>
      ) : (
        'Not Found'
      ),
    };
  },
};

export const meta = mergeMeta<typeof loader>(({ data, params }) => {
  if (!data) return notFoundMeta;

  const { tag } = params;

  return [
    { title: `Drinks with ${startCase(tag)}` },
    { name: 'description', content: `All drinks containing ${lowerCase(tag)}` },
  ];
});

export default function TagPage() {
  const { drinks } = useLoaderData<typeof loader>();

  return <DrinkList drinks={drinks} />;
}
