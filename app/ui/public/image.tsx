import type { Handle, Props } from "remix/component";
import { transformBaseImageProps, transformBaseSourceProps } from "@unpic/core/base";
import type { ImageKitOperations } from "unpic/providers/imagekit";
import { imagekitTransformer, isImageKitUrl } from "#/app/core/images.ts";
export type ImageProps = {
  src: string;
  alt?: string;
  width: number;
  height: number;
  sizes?: string;
  breakpoints?: number[];
  background?: string;
  priority?: boolean;
  className?: string;
};
export type SourceProps = ImageProps & { type?: string };
type ImageAttributes = Props<"img"> & {
  alt: string;
  srcset?: string;
  fetchpriority?: "high" | "low" | "auto";
};
type SourceAttributes = Props<"source"> & { srcset?: string };
export function Source(handle: Handle<SourceProps>) {
  return () => {
    const props = handle.props;
    if (!isImageKitUrl(props.src)) return null;
    const { srcset, ...attributes } = transformBaseSourceProps<
      SourceAttributes,
      ImageKitOperations,
      undefined
    >({
      ...props,
      breakpoints: props.breakpoints ? [...props.breakpoints] : undefined,
      transformer: imagekitTransformer,
    });
    return <source {...attributes} srcSet={srcset} />;
  };
}
export function Image(handle: Handle<ImageProps>) {
  return () => {
    const props = handle.props;
    const { srcset, fetchpriority, ...attributes } = transformBaseImageProps<
      ImageKitOperations,
      undefined,
      ImageAttributes
    >({
      ...props,
      alt: props.alt ?? "",
      breakpoints: props.breakpoints ? [...props.breakpoints] : undefined,
      transformer: imagekitTransformer,
    });
    return (
      <img
        {...attributes}
        alt={attributes.alt}
        className={props.className}
        srcSet={isImageKitUrl(props.src) ? srcset : undefined}
        fetchPriority={fetchpriority}
      />
    );
  };
}
