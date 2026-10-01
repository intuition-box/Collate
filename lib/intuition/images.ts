import type { IntuitionImageUploadInput, IntuitionUploadedImage, PublicIntuitionNetwork } from '@/types/api';

export const MAX_IMAGE_SIZE_BYTES = 12 * 1024 * 1024;
const MAX_PIN_IMAGE_EDGE_PX = 640;
const PIN_IMAGE_QUALITY = 0.78;

export function resolveIntuitionImageUrl(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const raw = value.trim().replace(/^['"]|['"]$/g, '');

  if (!raw) {
    return null;
  }

  if (raw.startsWith('https://') || raw.startsWith('http://') || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }

  if (raw.startsWith('ipfs://ipfs/')) {
    return `https://ipfs.io/${raw.slice('ipfs://'.length)}`;
  }

  if (raw.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${raw.slice('ipfs://'.length)}`;
  }

  if (raw.startsWith('/ipfs/')) {
    return `https://ipfs.io${raw}`;
  }

  return null;
}

export function getImagePreviewCandidates(value?: string | null): string[] {
  if (!value) {
    return [];
  }

  const raw = value.trim().replace(/^['"]|['"]$/g, '');

  if (!raw) {
    return [];
  }

  if (raw.startsWith('https://') || raw.startsWith('http://') || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return [raw];
  }

  if (raw.startsWith('ipfs://ipfs/')) {
    const path = raw.slice('ipfs://'.length);
    return [`https://ipfs.io/${path}`, `https://dweb.link/${path}`];
  }

  if (raw.startsWith('ipfs://')) {
    const cidPath = raw.slice('ipfs://'.length);
    return [`https://ipfs.io/ipfs/${cidPath}`, `https://dweb.link/ipfs/${cidPath}`];
  }

  if (raw.startsWith('/ipfs/')) {
    return [`https://ipfs.io${raw}`, `https://dweb.link${raw}`];
  }

  return [];
}

export function validateAtomImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Only image files are supported.';
  }

  if (file.type === 'image/svg+xml') {
    return 'SVG uploads are not supported here. Use a PNG or JPG image instead.';
  }

  if (file.size <= 0) {
    return 'Upload failed. The image file is empty.';
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'Image must be 12MB or smaller.';
  }

  return null;
}

export function readImageFileAsBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Upload failed.'));
        return;
      }

      const [, data = ''] = reader.result.split(',', 2);

      if (!data) {
        reject(new Error('Upload failed.'));
        return;
      }

      resolve(data);
    };

    reader.onerror = () => {
      reject(new Error('Upload failed.'));
    };

    reader.readAsDataURL(file);
  });
}

function loadImageFromObjectUrl(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not read this image file.'));
    image.src = objectUrl;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not optimize this image file.'));
          return;
        }

        resolve(blob);
      },
      'image/jpeg',
      PIN_IMAGE_QUALITY,
    );
  });
}

function getPinnedImageFilename(fileName: string): string {
  const trimmed = fileName.trim();

  if (!trimmed) {
    return 'atom-image.jpg';
  }

  return trimmed.replace(/\.[^.]+$/, '') + '.jpg';
}

export async function prepareImageFileForUpload(file: File): Promise<IntuitionImageUploadInput> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageFromObjectUrl(objectUrl);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;

    if (sourceWidth <= 0 || sourceHeight <= 0) {
      throw new Error('Could not read this image file.');
    }

    const scale = Math.min(1, MAX_PIN_IMAGE_EDGE_PX / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not optimize this image file.');
    }

    canvas.width = width;
    canvas.height = height;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const optimizedBlob = await canvasToJpegBlob(canvas);
    const data = await readImageFileAsBase64(optimizedBlob);

    return {
      contentType: 'image/jpeg',
      data,
      filename: getPinnedImageFilename(file.name),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function getImageDataUri(image: IntuitionImageUploadInput): string {
  return `data:${image.contentType};base64,${image.data}`;
}

export function normalizeImageUploadError(caughtError: unknown): string {
  if (caughtError instanceof DOMException && caughtError.name === 'AbortError') {
    return 'Upload failed.';
  }

  if (caughtError instanceof Error && caughtError.message.trim()) {
    const message = caughtError.message.trim();
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('local file upload failed through intuition image processing')) {
      return 'Intuition could not process this local image file. Try a smaller PNG/JPG, or use Pin from URL with a public HTTPS image.';
    }

    if (lowerMessage.includes('webhook')) {
      return 'Intuition image processing failed upstream. Try again, or use Pin from URL with a public HTTPS image.';
    }

    return message;
  }

  return 'Upload failed. You can still paste an image URL manually.';
}

export async function uploadIntuitionImage(
  network: PublicIntuitionNetwork,
  image: IntuitionImageUploadInput,
  signal?: AbortSignal,
): Promise<IntuitionUploadedImage> {
  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ network, image }),
    cache: 'no-store',
  };

  if (signal) {
    requestInit.signal = signal;
  }

  const response = await fetch('/api/intuition/upload-image', requestInit);
  const payload = (await response.json()) as IntuitionUploadedImage & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Upload failed with HTTP ${response.status}.`);
  }

  if (!payload.url || (!payload.url.startsWith('https://') && !payload.url.startsWith('ipfs://'))) {
    throw new Error('Upload failed.');
  }

  return payload.safe === undefined ? { url: payload.url } : { url: payload.url, safe: payload.safe };
}

export async function uploadIntuitionImageFromUrl(
  network: PublicIntuitionNetwork,
  imageUrl: string,
  signal?: AbortSignal,
): Promise<IntuitionUploadedImage> {
  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ network, imageUrl }),
    cache: 'no-store',
  };

  if (signal) {
    requestInit.signal = signal;
  }

  const response = await fetch('/api/intuition/upload-image', requestInit);
  const payload = (await response.json()) as IntuitionUploadedImage & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Image import failed with HTTP ${response.status}.`);
  }

  if (!payload.url || (!payload.url.startsWith('https://') && !payload.url.startsWith('ipfs://'))) {
    throw new Error('Image import failed.');
  }

  return {
    url: payload.url,
    ...(payload.safe === undefined ? {} : { safe: payload.safe }),
    ...(payload.originalUrl ? { originalUrl: payload.originalUrl } : {}),
  };
}
