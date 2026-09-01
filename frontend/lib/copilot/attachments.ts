import { convertHeicToJpeg, isHeic } from '@/lib/images';
import type { CopilotAttachment } from './types';

export const MAX_ATTACHMENTS = 5;
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB for short video clips and large documents

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
];

export const ACCEPTED_NATIVE_TYPES = [
  'application/pdf',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/mpeg',
];

export const ACCEPTED_DOC_TYPES = [
  'text/plain',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt
  'application/octet-stream',
];

export const ACCEPTED_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_NATIVE_TYPES,
  ...ACCEPTED_DOC_TYPES,
];

const EXTENSION_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  csv: 'text/csv',
  txt: 'text/plain',
  json: 'application/json',
  xml: 'application/xml',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  bin: 'application/octet-stream',
};

export function resolveMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_MAP[ext] || 'application/octet-stream';
}

export function isAcceptedType(file: File): boolean {
  const mime = resolveMimeType(file);
  return ACCEPTED_TYPES.includes(mime) || isHeic(file);
}

export function isVisualMedia(fileOrMime: string | File): boolean {
  const mime =
    typeof fileOrMime === 'string' ? fileOrMime : resolveMimeType(fileOrMime);
  return ACCEPTED_IMAGE_TYPES.includes(mime) || mime.startsWith('image/');
}

export type RejectionReason = 'type' | 'size' | 'count';

export interface ValidationResult {
  accepted: File[];
  rejected: { file: File; reason: RejectionReason }[];
}

export function validateFiles(
  files: File[],
  alreadyAttached: number = 0,
): ValidationResult {
  const accepted: File[] = [];
  const rejected: { file: File; reason: RejectionReason }[] = [];
  let slots = MAX_ATTACHMENTS - alreadyAttached;

  for (const file of files) {
    if (!isAcceptedType(file)) {
      rejected.push({ file, reason: 'type' });
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      rejected.push({ file, reason: 'size' });
      continue;
    }
    if (slots <= 0) {
      rejected.push({ file, reason: 'count' });
      continue;
    }
    accepted.push(file);
    slots -= 1;
  }
  return { accepted, rejected };
}

export function rejectionMessage(reason: RejectionReason): string {
  if (reason === 'type') {
    return 'Supported formats: Photos (JPG, PNG, HEIC), Video (MP4, MOV), PDF, Word, Excel, PPT, JSON, XML, TXT, and Binary';
  }
  if (reason === 'size') return 'Files must be under 25MB';
  return `You can attach up to ${MAX_ATTACHMENTS} files`;
}

export function stripDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });
}

export async function toAttachment(file: File): Promise<CopilotAttachment> {
  // Client-side conversion handles iPhone HEIC photos automatically
  const usable = isHeic(file) ? await convertHeicToJpeg(file) : file;
  const mimeType = resolveMimeType(usable);
  const dataUrl = await readAsDataUrl(usable);

  return {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mimeType,
    data: stripDataUrl(dataUrl),
    name: usable.name,
    previewUrl: isVisualMedia(mimeType) ? URL.createObjectURL(usable) : '',
  };
}
