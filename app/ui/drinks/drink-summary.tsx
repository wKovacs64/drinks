import type { Handle } from "remix/component";
import { classes } from "#/app/core/public/strings.ts";
import { Source, Image, type ImageProps, type SourceProps } from "#/app/ui/images/public/image.tsx";
import type { DrinkView } from "#/app/modules/drinks/drinks.ts";

export function DrinkSummary(handle: Handle<DrinkSummaryProps>) {
  return () => {
    const { className, drink, breakpoints, sizes, stacked, compact, priority } = handle.props;
    const imageProps = {
      src: drink.image.url,
      background: drink.image.blurDataUrl,
      breakpoints,
      sizes,
      width: breakpoints.at(-1) ?? 640,
      height: breakpoints.at(-1) ?? 640,
      priority,
    } satisfies SourceProps | ImageProps;

    return (
      <section
        className={classes(
          "flex h-full flex-col bg-gray-100",
          compact && "@min-[360px]:flex-row",
          className,
        )}
      >
        <figure
          className={classes(
            "m-0 flex-1",
            compact && "@min-[360px]:w-2/5 @min-[360px]:flex-none",
            !drink.image && "bg-stone-900",
          )}
        >
          <picture className="aspect-square">
            <Source type="image/avif" {...imageProps} />
            <Source type="image/webp" {...imageProps} />
            <Image alt={drink.title} {...imageProps} />
          </picture>
        </figure>
        <div className={classes("flex flex-1", compact && "min-w-0")}>
          <div
            className={classes(
              "flex flex-1 flex-col",
              compact ? "min-w-0 p-4" : stacked ? "px-8 pt-8" : "p-8",
            )}
          >
            <h2
              className={classes(
                "tracking-widest uppercase",
                compact ? "text-xl" : "text-2xl",
                stacked && "xl:text-4xl",
              )}
            >
              {drink.title}
            </h2>
            <ul
              className={classes(
                "flex-1 list-outside list-disc leading-normal",
                compact ? "my-4 ps-5 text-base" : "my-8 pl-8 text-xl",
                stacked && "xl:text-2xl xl:leading-normal",
              )}
            >
              {drink.ingredients.map((ingredient) => (
                <li key={ingredient}>{ingredient}</li>
              ))}
            </ul>
            <div className={classes("text-right", stacked && "text-xl")}>
              {drink.calories ? <span>{drink.calories} cal</span> : ""}
            </div>
          </div>
        </div>
      </section>
    );
  };
}

type DrinkSummaryProps = {
  className?: string;
  drink: DrinkView;
  breakpoints: NonNullable<ImageProps["breakpoints"]>;
  sizes: NonNullable<ImageProps["sizes"]>;
  stacked?: boolean;
  compact?: boolean;
  priority?: ImageProps["priority"];
};
