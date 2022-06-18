import {
  json,
  type HeadersFunction,
  type LoaderFunction,
  type MetaFunction,
} from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getEnvVars } from '~/utils/env.server';
import { fetchGraphQL } from '~/utils/graphql.server';
import { cache } from '~/utils/cache.server';
import { withPlaceholderImages } from '~/utils/placeholder-images.server';
import { markdownToHtml } from '~/utils/markdown.server';
import { makeImageUrl } from '~/components/image';
import Nav from '~/components/nav';
import NavDivider from '~/components/nav-divider';
import NavLink from '~/components/nav-link';
import Glass from '~/components/glass';
import DrinkSummary from '~/components/drink-summary';
import DrinkDetails from '~/components/drink-details';
import type { DrinksResponse, EnhancedDrink } from '~/types';

interface LoaderData {
  drink: EnhancedDrink;
}

export const loader: LoaderFunction = async ({ params, request }) => {
  if (!params.slug) throw json('Missing slug', 400);

  const cacheKey = new URL(request.url).pathname;
  const cachedData: LoaderData = await cache.get(cacheKey);
  if (cachedData) return json<LoaderData>(cachedData);

  const { CONTENTFUL_ACCESS_TOKEN, CONTENTFUL_URL, CONTENTFUL_PREVIEW } =
    getEnvVars();

  const drinkQuery = /* GraphQL */ `
    query ($preview: Boolean, $slug: String) {
      drinkCollection(preview: $preview, limit: 1, where: { slug: $slug }) {
        drinks: items {
          title
          slug
          image {
            url
          }
          ingredients
          calories
          notes
          tags
        }
      }
    }
  `;

  const queryResponse = await fetchGraphQL(
    CONTENTFUL_URL,
    CONTENTFUL_ACCESS_TOKEN,
    drinkQuery,
    {
      preview: CONTENTFUL_PREVIEW === 'true',
      slug: params.slug,
    },
  );

  const queryResponseJson: DrinksResponse = await queryResponse.json();

  if (
    queryResponseJson.errors?.length ||
    !queryResponseJson.data.drinkCollection
  ) {
    throw json(queryResponseJson, 500);
  }

  const {
    data: {
      drinkCollection: { drinks },
    },
  } = queryResponseJson;

  if (drinks.length === 0) {
    throw json({ message: 'Drink not found' }, 404);
  }

  const drinksWithPlaceholderImages: Array<EnhancedDrink> =
    await withPlaceholderImages(drinks);

  const [enhancedDrink] = drinksWithPlaceholderImages;

  if (enhancedDrink.notes) {
    enhancedDrink.notes = markdownToHtml(enhancedDrink.notes);
  }

  const loaderData: LoaderData = { drink: enhancedDrink };

  await cache.put(cacheKey, loaderData);
  return json<LoaderData>(loaderData);
};

export const headers: HeadersFunction = ({ loaderHeaders }) => {
  return {
    'Cache-Control': loaderHeaders.get('Cache-Control') || '',
  };
};

export const meta: MetaFunction = (metaArgs) => {
  if (!metaArgs.data?.drink) return {};

  const { drink } = metaArgs.data;
  const { title, ingredients } = drink;
  const description = ingredients.join(', ');
  const socialImageUrl = makeImageUrl({
    baseImageUrl: drink.image.url,
    width: 1200,
    height: 630,
    fit: 'thumb',
    quality: 50,
    format: 'jpg',
    fl: 'progressive',
  });
  const socialImageAlt = `${title} in a glass`;

  return {
    title,
    description,
    'og:title': title,
    'og:description': description,
    'og:image': socialImageUrl,
    'og:image:alt': socialImageAlt,
    'twitter:card': 'summary_large_image',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': socialImageUrl,
    'twitter:image:alt': socialImageAlt,
  };
};

export default function DrinkPage() {
  const { drink } = useLoaderData<LoaderData>();
  const imageWidths = [320, 400, 420, 480, 640, 800, 840, 960, 1280];
  const imageSizesPerViewport = [
    '(min-width: 1280px) 640px',
    '((min-width: 1024px) and (max-width: 1279px)) 480px',
    '((min-width: 640px) and (max-width: 1023px)) 420px',
    '100vw',
  ];

  return (
    <div>
      <Nav>
        <ul>
          <NavLink to="/">All Drinks</NavLink>
          <NavDivider />
          <li className="inline">{drink.title}</li>
        </ul>
      </Nav>
      <main id="main">
        <Glass>
          <DrinkSummary
            className="lg:flex-row"
            drink={drink}
            imageWidths={imageWidths}
            imageSizesPerViewport={imageSizesPerViewport}
            stacked
          />
          <DrinkDetails drink={drink} />
        </Glass>
      </main>
    </div>
  );
}
