import { type Ref, useState, useRef, useImperativeHandle } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export type ImageCropHandle = {
  getCroppedImage: () => Promise<Blob | null>;
};

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

export function ImageCrop({
  existingImageUrl,
  ref,
}: {
  existingImageUrl?: string | null;
  ref?: Ref<ImageCropHandle>;
}) {
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSelectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  const onImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = event.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  };

  const handleChangeImage = () => {
    setImgSrc('');
    setCrop(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  async function getCroppedImage(): Promise<Blob | null> {
    const image = imgRef.current;
    if (!image || !crop) return null;

    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCrop = {
      x: (crop.x / 100) * image.width * scaleX,
      y: (crop.y / 100) * image.height * scaleY,
      width: (crop.width / 100) * image.width * scaleX,
      height: (crop.height / 100) * image.height * scaleY,
    };

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    });
  }

  useImperativeHandle(ref, () => ({ getCroppedImage }));

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      onChange={onSelectFile}
      className="hidden"
    />
  );

  // State: cropping a new image
  if (imgSrc) {
    return (
      <div className="space-y-3">
        {fileInput}
        <div>
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            aspect={1}
            className="max-h-96"
          >
            <img ref={imgRef} alt="Crop preview" src={imgSrc} onLoad={onImageLoad} />
          </ReactCrop>
        </div>
        <button
          type="button"
          onClick={handleChangeImage}
          className="rounded border border-zinc-700 px-2.5 py-1 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
        >
          Change image
        </button>
      </div>
    );
  }

  // State: existing image (edit mode)
  if (existingImageUrl) {
    return (
      <div className="space-y-3">
        {fileInput}
        <div className="flex items-center gap-4 rounded border border-dashed border-zinc-700 bg-zinc-900 p-4">
          <img src={existingImageUrl} alt="Current" className="h-20 w-20 rounded object-cover" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded border border-zinc-700 px-2.5 py-1 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            Change image
          </button>
        </div>
      </div>
    );
  }

  // State: empty (no image)
  return (
    <div className="space-y-3">
      {fileInput}
      <div className="flex items-center justify-center rounded border border-dashed border-zinc-700 bg-zinc-900 p-8">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          Select image
        </button>
      </div>
    </div>
  );
}
