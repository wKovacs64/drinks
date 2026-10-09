import type { Handle } from "remix/component";
import { classes } from "#/app/core/public/strings.ts";
import { Source, Image, type ImageProps, type SourceProps } from "#/app/ui/images/public/image.tsx";
import type { DrinkView } from "#/app/modules/drinks/drinks.ts";
import {
  detailImageSizes,
  drinkImageBreakpoints,
  galleryImageSizes,
} from "#/app/ui/drinks/image-layout.ts";

const imagePresets = {
  gallery: { breakpoints: drinkImageBreakpoints, sizes: galleryImageSizes },
  detail: { breakpoints: drinkImageBreakpoints, sizes: detailImageSizes },
  compact: { breakpoints: [320, 480, 640], sizes: "(min-width: 360px) 200px, 100vw" },
};

export function DrinkSummary(handle: Handle<DrinkSummaryProps>) {
  return () => {
    const { drink, variant, priority } = handle.props;
    const { breakpoints, sizes } = imagePresets[variant];
    const compact = variant === "compact";
    const detail = variant === "detail";
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
          detail && "lg:flex-row",
        )}
      >
        <figure
          className={classes(
            "m-0 flex-1",
            compact && "relative aspect-square @min-[360px]:w-2/5 @min-[360px]:flex-none",
            !drink.image && "bg-stone-900",
          )}
        >
          <picture className={compact ? "absolute inset-0" : "aspect-square"}>
            <Source type="image/avif" {...imageProps} />
            <Source type="image/webp" {...imageProps} />
            <Image
              alt={drink.title}
              {...imageProps}
              className={compact ? "[block-size:100%]" : undefined}
            />
          </picture>
        </figure>
        <div className={classes("flex flex-1", compact && "min-w-0")}>
          <div
            className={classes(
              "flex flex-1 flex-col",
              compact ? "min-w-0 p-4" : detail ? "px-8 pbs-8" : "p-8",
            )}
          >
            <h2
              className={classes(
                "tracking-widest uppercase",
                compact ? "text-xl" : "text-2xl",
                detail && "xl:text-4xl",
              )}
            >
              {drink.title}
            </h2>
            <ul
              className={classes(
                "flex-1 list-outside list-disc leading-normal",
                compact ? "my-4 ps-5 text-base" : "my-8 ps-8 text-xl",
                detail && "xl:text-2xl xl:leading-normal",
              )}
            >
              {drink.ingredients.map((ingredient) => (
                <li key={ingredient}>{ingredient}</li>
              ))}
            </ul>
            <div
              className={classes(
                compact ? "flex items-baseline gap-2" : "text-end",
                detail && "text-xl",
              )}
            >
              {drink.calories ? <span>{drink.calories} cal</span> : ""}
              {compact && <span className="ms-auto font-normal">drinks.fyi</span>}
            </div>
          </div>
        </div>
      </section>
    );
  };
}

type DrinkSummaryProps = {
  drink: DrinkView;
  variant: keyof typeof imagePresets;
  priority?: ImageProps["priority"];
};
