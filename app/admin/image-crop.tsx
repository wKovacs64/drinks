import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

type ImageCropProps = {
  onCropComplete: (croppedImageBlob: Blob) => void;
};

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

export function ImageCrop({ onCropComplete }: ImageCropProps) {
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);

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

  const getCroppedImg = useCallback(async () => {
    const image = imgRef.current;
    if (!image || !crop) return;

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
    if (!ctx) return;

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

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      },
      'image/jpeg',
      0.9,
    );
  }, [crop, onCropComplete]);

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        onChange={onSelectFile}
        className="block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
        data-testid="image-upload-input"
      />

      {imgSrc && (
        <>
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            aspect={1}
            className="max-h-96"
          >
            <img ref={imgRef} alt="Crop preview" src={imgSrc} onLoad={onImageLoad} />
          </ReactCrop>

          <button
            type="button"
            onClick={getCroppedImg}
            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            data-testid="confirm-crop-button"
          >
            Confirm Crop
          </button>
        </>
      )}
    </div>
  );
}
