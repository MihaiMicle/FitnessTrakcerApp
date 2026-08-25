// lib/images.ts

const HEIC_PATTERN = /\.heic$|\.heif$/i;

export function isHeic(file: File): boolean {
  return HEIC_PATTERN.test(file.name) || file.type === 'image/heic';
}

/**
 * iPhone photos arrive as HEIC, which browsers and Supabase storage won't
 * render. Converts to JPEG; the caller handles failures.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import('heic2any')).default;
  const converted = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.8,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const name = file.name.replace(/\.heic|\.heif/gi, '.jpg');
  return new File([blob], name, { type: 'image/jpeg' });
}

/** Picks a storage-safe mime type and matching extension for an upload. */
export function resolveImageType(file: File): {
  mimeType: string;
  extension: string;
} {
  const type = file.type || 'image/jpeg';
  if (type.includes('png')) return { mimeType: type, extension: 'png' };
  if (type.includes('webp')) return { mimeType: type, extension: 'webp' };
  return { mimeType: 'image/jpeg', extension: 'jpg' };
}
