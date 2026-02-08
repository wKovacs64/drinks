import { Link, href } from 'react-router';
import type { EnhancedDrink } from '#/app/types';
import { Glass } from './glass';
import { DrinkSummary } from './drink-summary';

export function DrinkList({ drinks }: { drinks: EnhancedDrink[] }) {
  return (
    <div className="grid gap-4 sm:gap-8 lg:grid-cols-2 xl:grid-cols-3">
      {drinks.map((drink, index) => (
        <Link
          key={drink.slug}
          to={href('/:slug', { slug: drink.slug })}
          aria-label={drink.title}
          className="group focus-visible:outline-hidden"
          prefetch="viewport"
        >
          <Glass className="h-full transition group-hover:border-orange-800 group-hover:shadow-lg group-hover:shadow-orange-800 group-focus:border-orange-800 group-focus:shadow-lg group-focus:shadow-orange-800 lg:group-hover:-translate-y-2 lg:group-focus:-translate-y-2">
            <DrinkSummary
              drink={drink}
              // 800 and up are for high density displays (doubling the base image sizes)
              breakpoints={[320, 400, 420, 480, 640, 800, 840, 960, 1280]}
              sizes={[
                '(min-width: 1280px) 400px', // 3 images per row
                '((min-width: 1024px) and (max-width: 1279px)) 480px', // 2 images per row
                '((min-width: 640px) and (max-width: 1023px)) 420px', // 1 image per row
                '100vw', // 1 image per row, no padding
              ].join(', ')}
              priority={index < 6}
            />
          </Glass>
        </Link>
      ))}
    </div>
  );
}
