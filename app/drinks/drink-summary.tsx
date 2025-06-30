import { clsx } from 'clsx';
import { Source, Image, type ImageProps, type SourceProps } from '@unpic/react';
import type { EnhancedDrink } from '~/types';

export function DrinkSummary({
  className,
  drink,
  breakpoints,
  sizes,
  stacked,
  priority,
}: DrinkSummaryProps) {
  const imageProps = {
    src: drink.image.url,
    background: drink.image.blurDataUrl,
    breakpoints,
    sizes,
    width: breakpoints.at(-1) ?? 640,
    height: breakpoints.at(-1) ?? 640,
    operations: { contentful: { q: 50 } },
    priority,
  } satisfies SourceProps | ImageProps;

  return (
    <section className={clsx('flex h-full flex-col bg-gray-100', className)}>
      <figure className={clsx('m-0 flex-1', !drink.image && 'bg-stone-900')}>
        <picture className="aspect-square">
          <Source type="image/avif" {...imageProps} />
          <Source type="image/webp" {...imageProps} />
          <Image alt={drink.title} {...imageProps} />
        </picture>
      </figure>
      <div className="flex flex-1">
        <div className={clsx('flex flex-1 flex-col', stacked ? 'px-8 pt-8' : 'p-8')}>
          <h2 className={clsx('text-2xl tracking-widest uppercase', stacked && 'xl:text-4xl')}>
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

type DrinkSummaryProps = {
  className?: React.HTMLAttributes<HTMLElement>['className'];
  drink: EnhancedDrink;
  breakpoints: NonNullable<ImageProps['breakpoints']>;
  sizes: NonNullable<ImageProps['sizes']>;
  stacked?: boolean;
  priority?: ImageProps['priority'];
};
