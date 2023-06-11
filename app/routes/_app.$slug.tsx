import { json, type LoaderArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getEnvVars } from '~/utils/env.server.ts';
import { mergeMeta } from '~/utils/meta.ts';
import { fetchGraphQL } from '~/utils/graphql.server.ts';
import { cache } from '~/utils/cache.server.ts';
import { withPlaceholderImages } from '~/utils/placeholder-images.server.ts';
import { markdownToHtml } from '~/utils/markdown.server.ts';
import { makeImageUrl } from '~/core/image.tsx';
import { notFoundMeta } from '~/routes/_app.$.tsx';
import Nav from '~/navigation/nav.tsx';
import NavDivider from '~/navigation/nav-divider.tsx';
import NavLink from '~/navigation/nav-link.tsx';
import Glass from '~/drinks/glass.tsx';
import DrinkSummary from '~/drinks/drink-summary.tsx';
import DrinkDetails from '~/drinks/drink-details.tsx';
import type { DrinksResponse, EnhancedDrink } from '~/types.ts';

export const loader = async ({ params, request }: LoaderArgs) => {
  if (!params.slug) throw json('Missing slug', 400);

  const cacheKey = new URL(request.url).pathname;
  const cachedData: { drink: EnhancedDrink } = await cache.get(cacheKey);
  if (cachedData) return json(cachedData);

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

  const loaderData = { drink: enhancedDrink };

  await cache.set(cacheKey, loaderData);
  return json(loaderData);
};

export const meta = mergeMeta<typeof loader>(({ data }) => {
  if (!data) return notFoundMeta;

  const { drink } = data;
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

  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: socialImageUrl },
    { property: 'og:image:alt', content: socialImageAlt },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: socialImageUrl },
    { name: 'twitter:image:alt', content: socialImageAlt },
  ];
});

export default function DrinkPage() {
  const { drink } = useLoaderData<typeof loader>();

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
