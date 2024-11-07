import type { HeadersFunction } from '@remix-run/node';
import { cacheHeader } from 'pretty-cache-header';
import { mergeMeta } from '~/utils/meta';
import { NotFound } from '~/core/not-found';

export const headers: HeadersFunction = () => {
  return {
    'Cache-Control': cacheHeader({
      maxAge: '1min',
      sMaxage: '5min',
      mustRevalidate: true,
    }),
  };
};

export const notFoundMeta = [
  { title: 'Not Found' },
  { name: 'description', content: "There's nothing of interest here." },
];

export const meta = mergeMeta(() => notFoundMeta);

export default NotFound;
