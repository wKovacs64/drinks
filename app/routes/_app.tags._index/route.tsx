import { useLoaderData } from '@remix-run/react';
import { kebabCase } from 'lodash-es';
import type { HeadersFunction } from '@remix-run/node';
import { cacheHeader } from 'pretty-cache-header';
import TagLink from '~/tags/tag-link';
import Tag from '~/tags/tag';
import { mergeMeta } from '~/utils/meta';
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

export const meta = mergeMeta<typeof loader>(() => {
  return [
    { title: 'Ingredient Tags' },
    { name: 'description', content: 'Discover drinks by ingredient' },
  ];
});

export default function TagsPage() {
  const { tags } = useLoaderData<typeof loader>();

  return <TagList tags={tags} />;
}

function TagList({ tags }: { tags: string[] }) {
  return (
    <div
      // TODO: this needs work, particularly wrt horizontal margins
      className="mx-4 grid gap-4 sm:mx-0 sm:gap-8 lg:grid-cols-2 xl:grid-cols-3"
    >
      {tags.map((tag) => (
        <TagLink to={`/tags/${kebabCase(tag)}`} key={tag}>
          <Tag className="p-4 text-2xl lg:p-6 lg:text-4xl">{tag}</Tag>
        </TagLink>
      ))}
    </div>
  );
}
