interface Window {
  recordUploadedImage?: (summary: string) => Promise<void>;
  releaseCrop?: () => void;
  recordSubmissionState?: (state: string) => Promise<void>;
  recordCroppedImage?: (image: { width: number; height: number; type: string }) => Promise<void>;
  editorNavigationMarker?: string;
}
