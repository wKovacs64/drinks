import type { Handle } from "remix/component";
import { transformBaseSourceProps } from "@unpic/core/base";
import { imagekitTransformer, isImageKitUrl } from "#/app/core/public/images.ts";
import { detailImageSizes, drinkImageBreakpoints, galleryImageSizes } from "./image-layout.ts";
import type { DrinkView } from "#/app/modules/drinks/drinks.ts";

export type ImagePreloadProps = { src: string; layout: "gallery" | "detail"; media?: string };

export function getGalleryImagePreloads(drinks: DrinkView[]): ImagePreloadProps[] {
  return drinks.slice(0, 3).map((drink, index) => ({
    src: drink.image.url,
    layout: "gallery",
    media: index === 1 ? "(min-width: 1024px)" : index === 2 ? "(min-width: 1280px)" : undefined,
  }));
}

export function ImagePreload(handle: Handle<ImagePreloadProps>) {
  return () => {
    const { src, layout, media } = handle.props;
    if (!isImageKitUrl(src)) return null;
    const { srcset, sizes } = transformBaseSourceProps({
      src,
      width: 1280,
      height: 1280,
      breakpoints: [...drinkImageBreakpoints],
      sizes: layout === "gallery" ? galleryImageSizes : detailImageSizes,
      type: "image/avif",
      transformer: imagekitTransformer,
    });
    const responsiveAttributes = {
      imageSrcSet: srcset ?? undefined,
      imageSizes: sizes ?? undefined,
    };
    return (
      <link
        rel="preload"
        as="image"
        data-rmx-key={`preload:image:${src}:${media ?? ""}`}
        type="image/avif"
        media={media}
        {...responsiveAttributes}
        fetchPriority="high"
      />
    );
  };
}
