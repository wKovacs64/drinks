import { Link, useFetcher, href } from 'react-router';
import { Image } from '@unpic/react';
import { useSortableData } from '#/app/admin/use-sortable-data';
import { getAllDrinks } from '#/app/models/drink.server';
import type { Route } from './+types/admin.drinks._index';

export function meta() {
  return [{ title: 'Drinks | Admin | drinks.fyi' }];
}

export async function loader(_args: Route.LoaderArgs) {
  const drinks = await getAllDrinks();
  return { drinks };
}

type Drink = Route.ComponentProps['loaderData']['drinks'][number];

type SortableColumn = 'title' | 'slug' | 'calories' | 'rank';

const SORTABLE_COLUMNS: { key: SortableColumn; label: string; align?: 'right' }[] = [
  { key: 'title', label: 'Title' },
  { key: 'slug', label: 'Slug' },
  { key: 'calories', label: 'Calories' },
  { key: 'rank', label: 'Rank' },
];

function SortArrow({
  columnKey,
  sort,
}: {
  columnKey: string;
  sort: { key: string; direction: 'asc' | 'desc' } | null;
}) {
  const isActive = sort !== null && sort.key === columnKey;
  return (
    <span className={`ml-1 ${isActive ? '' : 'invisible'}`}>
      {isActive && sort.direction === 'desc' ? '↓' : '↑'}
    </span>
  );
}

function DrinkRow({ drink }: { drink: Drink }) {
  const fetcher = useFetcher();

  return (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
      <td className="py-3 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <Image
            src={drink.imageUrl}
            width={32}
            height={32}
            alt=""
            className="rounded object-cover"
          />
          <span className="font-medium text-zinc-300">{drink.title}</span>
        </div>
      </td>
      <td className="py-3 text-sm text-zinc-400">{drink.slug}</td>
      <td className="py-3 text-sm text-zinc-400">{drink.calories}</td>
      <td className="py-3 text-sm text-zinc-400">{drink.rank}</td>
      <td className="py-3 text-right text-sm whitespace-nowrap">
        <Link
          to={href('/admin/drinks/:slug/edit', { slug: drink.slug })}
          className="text-zinc-400 hover:text-amber-500"
        >
          Edit
        </Link>
        <fetcher.Form
          method="post"
          action={href('/admin/drinks/:slug/delete', { slug: drink.slug })}
          className="ml-4 inline"
          onSubmit={(event) => {
            if (!confirm('Are you sure you want to delete this drink?')) {
              event.preventDefault();
            }
          }}
        >
          <button type="submit" className="text-zinc-500 hover:text-red-400">
            Delete
          </button>
        </fetcher.Form>
      </td>
    </tr>
  );
}

export default function AdminDrinksList({ loaderData }: Route.ComponentProps) {
  const { drinks } = loaderData;
  const { processed, filter, setFilter, sort, handleSort } = useSortableData(drinks);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-medium text-zinc-200">Drinks</h1>
          <span className="text-sm text-zinc-500">{drinks.length}</span>
        </div>
        <Link
          to={href('/admin/drinks/new')}
          className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-500"
        >
          Add Drink
        </Link>
      </div>

      <input
        type="text"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setFilter('');
          }
        }}
        placeholder="Filter drinks..."
        className="mb-4 w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
      />

      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs tracking-wider text-zinc-500 uppercase">
            {SORTABLE_COLUMNS.map((column) => (
              <th key={column.key} className="pb-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort(column.key)}
                  className="cursor-pointer hover:text-zinc-300"
                >
                  {column.label}
                  <SortArrow columnKey={column.key} sort={sort} />
                </button>
              </th>
            ))}
            <th className="pb-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {processed.map((drink) => (
            <DrinkRow key={drink.id} drink={drink} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
