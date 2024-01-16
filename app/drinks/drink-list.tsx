import { Link } from '@remix-run/react';
import type { EnhancedDrink } from '~/types';
import Glass from './glass';
import DrinkSummary from './drink-summary';

export default function DrinkList({ drinks }: DrinkListProps) {
  const imageWidths = [320, 400, 420, 480, 640, 800, 840, 960, 1280];
  const imageSizesPerViewport = [
    '(min-width: 1280px) 640px',
    '((min-width: 1024px) and (max-width: 1279px)) 480px',
    '((min-width: 640px) and (max-width: 1023px)) 420px',
    '100vw',
  ];

  return (
    <div className="grid gap-4 sm:gap-8 lg:grid-cols-2 xl:grid-cols-3">
      {drinks.map((drink) => (
        <Link
          key={drink.slug}
          to={`/${drink.slug}`}
          aria-label={drink.title}
          className="group focus-visible:outline-none"
          prefetch="viewport"
        >
          <Glass className="h-full transition group-hover:border-orange-800 group-hover:shadow-lg group-hover:shadow-orange-800 group-focus:border-orange-800 group-focus:shadow-lg group-focus:shadow-orange-800 lg:group-hover:-translate-y-2 lg:group-focus:-translate-y-2">
            <DrinkSummary
              drink={drink}
              imageWidths={imageWidths}
              imageSizesPerViewport={imageSizesPerViewport}
            />
          </Glass>
        </Link>
      ))}
    </div>
  );
}

interface DrinkListProps {
  drinks: EnhancedDrink[];
}
