export interface SharePhoto {
  url: string;
  weight_kg: number;
  date: string;
}

const PANE_W = 760;
const PANE_H = 1140;
const CAPTION_H = 170;
const DIVIDER = 4;

/* Supabase serves public buckets with permissive CORS */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load photo'));
    img.src = url;
  });
}

/* Fills the box, cropping the overflow, so panes stay the same size */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(
    img,
    (img.width - sw) / 2,
    (img.height - sh) / 2,
    sw,
    sh,
    x,
    y,
    w,
    h,
  );
}

export function formatPhotoDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function daysBetween(a: string, b: string): number {
  const start = new Date(`${a}T00:00:00`).getTime();
  const end = new Date(`${b}T00:00:00`).getTime();
  if (isNaN(start) || isNaN(end)) return 0;
  return Math.round(Math.abs(end - start) / 86_400_000);
}

/* Renders one or two photos with their weight and date into a PNG blob */
export async function buildComparisonImage(
  photos: SharePhoto[],
): Promise<Blob> {
  const images = await Promise.all(photos.map((p) => loadImage(p.url)));

  const count = images.length;
  const width = count * PANE_W + (count - 1) * DIVIDER;
  const height = PANE_H + CAPTION_H;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);

  images.forEach((img, i) => {
    const x = i * (PANE_W + DIVIDER);
    drawCover(ctx, img, x, 0, PANE_W, PANE_H);

    const centre = x + PANE_W / 2;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 46px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`${photos[i].weight_kg.toFixed(1)} kg`, centre, PANE_H + 72);

    ctx.fillStyle = '#a3a3a3';
    ctx.font = '30px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(formatPhotoDate(photos[i].date), centre, PANE_H + 118);
  });

  if (count === 2) {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(PANE_W, 0, DIVIDER, PANE_H);

    const delta = photos[1].weight_kg - photos[0].weight_kg;
    const span = daysBetween(photos[0].date, photos[1].date);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#818cf8';
    ctx.font = '600 28px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(
      `${span} days · ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kg`,
      width / 2,
      PANE_H + 158,
    );
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Could not render image')),
      'image/png',
    );
  });
}

/* Opens the system share sheet */
export async function shareImageBlob(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared' as const;
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'cancelled' as const;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return 'downloaded' as const;
}
