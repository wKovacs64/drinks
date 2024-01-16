import { useLoaderData } from '@remix-run/react';
import DrinkList from '~/drinks/drink-list';
import { loader } from './loader.server';

export { loader };

export default function HomePage() {
  const { drinks } = useLoaderData<typeof loader>();

  return <DrinkList drinks={drinks} />;
}
