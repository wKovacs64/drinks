import clsx from 'clsx';
import Image, { getImageProps } from '~/core/image';
import type { EnhancedDrink } from '~/types';

export default function DrinkSummary({
  className,
  drink,
  stacked,
  imageWidths,
  imageSizesPerViewport,
}: DrinkSummaryProps) {
  return (
    <section className={clsx('flex h-full flex-col bg-gray-100', className)}>
      <figure className={clsx('m-0 flex-1', !drink.image && 'bg-stone-900')}>
        <Image
          {...getImageProps({
            containerClassName: 'aspect-square',
            alt: drink.title,
            blurDataUrl: drink.image.blurDataUrl,
            imageUrl: drink.image.url,
            imageWidths,
            imageSizesPerViewport,
          })}
        />
      </figure>
      <div className="flex flex-1">
        <div className={clsx('flex flex-1 flex-col', stacked ? 'px-8 pt-8' : 'p-8')}>
          <h2 className={clsx('text-2xl uppercase tracking-widest', stacked && 'xl:text-4xl')}>
            {drink.title}
          </h2>
          <ul
            className={clsx(
              'my-8 flex-1 list-outside list-disc pl-8 text-xl leading-normal',
              stacked && 'xl:text-2xl xl:leading-normal',
            )}
          >
            {drink.ingredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
          <div className={clsx('text-right', stacked && 'text-xl')}>
            {drink.calories ? <span>{drink.calories} cal</span> : ''}
          </div>
        </div>
      </div>
    </section>
  );
}

interface DrinkSummaryProps {
  className?: React.HTMLAttributes<HTMLElement>['className'];
  drink: EnhancedDrink;
  stacked?: boolean;
  imageWidths: Parameters<typeof getImageProps>[0]['imageWidths'];
  imageSizesPerViewport: Parameters<typeof getImageProps>[0]['imageSizesPerViewport'];
}
