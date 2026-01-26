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
        <h1 className="text-2xl font-bold">Drinks</h1>
        <Link
          to="/admin/drinks/new"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Add Drink
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Calories
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Rank
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {drinks.map((drink) => (
              <tr key={drink.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img src={drink.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
                    <span className="ml-3 font-medium">{drink.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{drink.slug}</td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                  {drink.calories}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{drink.rank}</td>
                <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                  <Link
                    to={`/admin/drinks/${drink.slug}/edit`}
                    className="text-blue-600 hover:text-blue-900"
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
                    <button type="submit" className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
                  </Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
