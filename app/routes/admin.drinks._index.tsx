import { Link, Form } from 'react-router';
import { getAllDrinks } from '#/app/models/drink.server';
import type { Route } from './+types/admin.drinks._index';

export async function loader(_args: Route.LoaderArgs) {
  const drinks = await getAllDrinks();
  return { drinks };
}

export default function AdminDrinksList({ loaderData }: Route.ComponentProps) {
  const { drinks } = loaderData;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-medium text-zinc-200">Drinks</h1>
          <span className="text-sm text-zinc-500">{drinks.length}</span>
        </div>
        <Link
          to="/admin/drinks/new"
          className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-500"
        >
          Add Drink
        </Link>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs tracking-wider text-zinc-500 uppercase">
            <th className="pb-3 font-medium">Title</th>
            <th className="pb-3 font-medium">Slug</th>
            <th className="pb-3 font-medium">Calories</th>
            <th className="pb-3 font-medium">Rank</th>
            <th className="pb-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {drinks.map((drink) => (
            <tr key={drink.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              <td className="py-3 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <img
                    src={`${drink.imageUrl}?tr=w-64,h-64`}
                    alt=""
                    className="h-8 w-8 rounded object-cover"
                  />
                  <span className="font-medium text-zinc-300">{drink.title}</span>
                </div>
              </td>
              <td className="py-3 text-sm text-zinc-400">{drink.slug}</td>
              <td className="py-3 text-sm text-zinc-400">{drink.calories}</td>
              <td className="py-3 text-sm text-zinc-400">{drink.rank}</td>
              <td className="py-3 text-right text-sm whitespace-nowrap">
                <Link
                  to={`/admin/drinks/${drink.slug}/edit`}
                  className="text-zinc-400 hover:text-amber-500"
                >
                  Edit
                </Link>
                <Form
                  method="post"
                  action={`/admin/drinks/${drink.slug}/delete`}
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
                </Form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
