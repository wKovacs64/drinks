import { data } from 'react-router';
import { kebabCase } from 'lodash-es';
import { cacheHeader } from 'pretty-cache-header';
import { defaultPageTitle, defaultPageDescription } from '#/app/core/config';
import { getAllTags } from '#/app/models/drink.server';
import { TagLink } from '#/app/tags/tag-link';
import { Tag } from '#/app/tags/tag';
import { getSurrogateKeyForTag } from '#/app/tags/utils';
import { getEnvVars } from '#/app/utils/env.server';
import type { Route } from './+types/_app.tags._index';

const { SITE_IMAGE_URL, SITE_IMAGE_ALT } = getEnvVars();

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function loader() {
  const tags = await getAllTags();
  const everyTagSurrogateKey = tags.map(getSurrogateKeyForTag).join(' ');

  return data(
    {
      tags,
      socialImageUrl: SITE_IMAGE_URL,
      socialImageAlt: SITE_IMAGE_ALT,
    },
    {
      headers: {
        'Surrogate-Key': `all tags ${everyTagSurrogateKey}`,
        'Cache-Control': cacheHeader({
          public: true,
          maxAge: '30sec',
          sMaxage: '1yr',
          staleWhileRevalidate: '10min',
          staleIfError: '1day',
        }),
      },
    },
  );
}

export function meta({ loaderData }: Route.MetaArgs) {
  const { socialImageUrl, socialImageAlt } = loaderData ?? {};

  return [
    { title: 'Ingredient Tags' },
    { name: 'description', content: 'Discover drinks by ingredient' },
    { property: 'og:title', content: defaultPageTitle },
    { property: 'og:description', content: defaultPageDescription },
    { property: 'og:image', content: socialImageUrl },
    { property: 'og:image:alt', content: socialImageAlt },
    { name: 'twitter:title', content: defaultPageTitle },
    { name: 'twitter:description', content: defaultPageDescription },
    { name: 'twitter:image', content: socialImageUrl },
    { name: 'twitter:image:alt', content: socialImageAlt },
  ];
}

export default function TagsPage({ loaderData }: Route.ComponentProps) {
  const { tags } = loaderData;

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
