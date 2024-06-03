/* eslint-disable jsx-a11y/alt-text */
import * as React from 'react';
import clsx from 'clsx';

export default function Image({
  containerClassName,
  blurDataUrl,
  fallbackSrc,
  sizes,
  srcSetByFormat,
  alt,
  loading,
}: ImageProps) {
  const [isImageVisible, setIsImageVisible] = React.useState(false);
  const hasImageLoadedHandlerBeenCalledYetRef = React.useRef(false);
  const jsImageRef = React.useRef<HTMLImageElement>(null);

  const commonImageProps: React.ImgHTMLAttributes<HTMLImageElement> = {
    src: fallbackSrc,
    srcSet: srcSetByFormat.jpg,
    sizes,
    alt,
    loading,
    decoding: 'async',
    width: '100%',
    height: '100%',
  };

  const handleImageLoaded = () => {
    if (!hasImageLoadedHandlerBeenCalledYetRef.current) {
      hasImageLoadedHandlerBeenCalledYetRef.current = true;
      setIsImageVisible(true);
    }
  };

  React.useEffect(() => {
    if (jsImageRef.current?.complete) {
      // Image was loaded from cache, so the 'load' event won't fire.
      // Therefore, we'll invoke the handler manually.
      handleImageLoaded();
    }
  }, []);

  return (
    <div className={clsx('relative', containerClassName)}>
      <img
        className="absolute left-0 top-0"
        src={blurDataUrl}
        alt={alt}
        height="100%"
        width="100%"
      />
      <div className="absolute left-0 top-0 backdrop-blur-md" />
      <picture className="absolute left-0 top-0">
        <source type="image/avif" srcSet={srcSetByFormat.avif} sizes={sizes} />
        <source type="image/webp" srcSet={srcSetByFormat.webp} sizes={sizes} />
        <img
          ref={jsImageRef}
          onLoad={handleImageLoaded}
          className={clsx('object-cover transition-opacity', {
            'opacity-0': !isImageVisible,
          })}
          {...commonImageProps}
        />
      </picture>
      <noscript>
        <picture className="absolute left-0 top-0">
          <source type="image/avif" srcSet={srcSetByFormat.avif} sizes={sizes} />
          <source type="image/webp" srcSet={srcSetByFormat.webp} sizes={sizes} />
          <img className="object-cover" {...commonImageProps} />
        </picture>
      </noscript>
    </div>
  );
}

interface ImageProps {
  containerClassName?: React.HTMLAttributes<HTMLDivElement>['className'];
  blurDataUrl: string;
  fallbackSrc: string;
  sizes: string;
  srcSetByFormat: Record<ImageFormat, string>;
  alt: React.ImgHTMLAttributes<HTMLImageElement>['alt'];
  loading?: React.ImgHTMLAttributes<HTMLImageElement>['loading'];
}

type ImageFormat = 'avif' | 'webp' | 'jpg';

export function getImageProps({
  imageUrl,
  imageWidths,
  imageSizesPerViewport,
  ...otherImageProps
}: Omit<ImageProps, 'fallbackSrc' | 'sizes' | 'srcSetByFormat'> & {
  imageUrl: string;
  imageWidths: number[];
  imageSizesPerViewport: string[];
}): ImageProps {
  const fallbackSrc = makeImageUrl({
    baseImageUrl: imageUrl,
    width: Math.ceil(imageWidths.reduce((a, b) => a + b, 0) / imageWidths.length),
    quality: 50,
    format: 'jpg',
    fl: 'progressive',
  });

  const srcSetsMap = imageWidths.reduce<{
    [k in ImageFormat]: string[];
  }>(
    (acc, size) => {
      acc.avif.push(
        makeSrcSetEntry({
          baseImageUrl: imageUrl,
          width: size,
          quality: 50,
          format: 'avif',
        }),
      );
      acc.webp.push(
        makeSrcSetEntry({
          baseImageUrl: imageUrl,
          width: size,
          quality: 50,
          format: 'webp',
        }),
      );
      acc.jpg.push(
        makeSrcSetEntry({
          baseImageUrl: imageUrl,
          width: size,
          quality: 50,
          format: 'jpg',
          fl: 'progressive',
        }),
      );
      return acc;
    },
    {
      avif: [],
      webp: [],
      jpg: [],
    },
  );

  const srcSetByFormat: Record<ImageFormat, string> = {
    avif: srcSetsMap.avif.join(', '),
    webp: srcSetsMap.webp.join(', '),
    jpg: srcSetsMap.jpg.join(', '),
  };

  const sizes = imageSizesPerViewport.join(', ');

  return {
    fallbackSrc,
    sizes,
    srcSetByFormat,
    ...otherImageProps,
  };
}

// TODO: abstract Contentful stuff like this into a separate file?
export function makeImageUrl({
  baseImageUrl,
  width,
  height,
  fit,
  quality,
  format,
  fl,
}: {
  baseImageUrl: string;
  width: number;
  height?: number;
  fit?: ImageFit;
  quality: number;
  format: ImageFormat;
  fl?: string;
}) {
  const urlSearchParams = new URLSearchParams({
    w: String(width),
    q: String(quality),
    fm: format,
  });

  if (height) urlSearchParams.set('h', String(height));
  if (fit) urlSearchParams.set('fit', fit);
  if (fl) urlSearchParams.set('fl', fl);

  return `${baseImageUrl}?${urlSearchParams.toString()}`;
}

function makeSrcSetEntry({
  baseImageUrl,
  width,
  height,
  fit,
  quality,
  format,
  fl,
}: {
  baseImageUrl: string;
  width: number;
  height?: number;
  fit?: ImageFit;
  quality: number;
  format: ImageFormat;
  fl?: string;
}) {
  return `${makeImageUrl({
    baseImageUrl,
    width,
    height,
    fit,
    quality,
    format,
    fl,
  })} ${width}w`;
}

type ImageFit = 'pad' | 'fill' | 'scale' | 'crop' | 'thumb';
