/**
 * Hitting a file-size limit ("under 100 KB") and smaller PNGs that stay PNG.
 *
 * For a target size, quality is found by binary search at each size step,
 * largest dimensions first, so the result is the biggest, best-looking image
 * that still fits. Only if no quality fits at full size does the image get
 * smaller.
 */
import { canvasToBlob, draw } from "./images";

const SIDES = [0, 4000, 3000, 2400, 2000, 1600, 1280, 1024, 800, 640, 480, 360, 240];

export type Fitted = { blob: Blob; width: number; height: number; quality: number; fits: boolean };

export async function fitToSize(
  bitmap: ImageBitmap,
  targetBytes: number,
  type: "image/jpeg" | "image/webp",
): Promise<Fitted> {
  let smallest: Fitted | null = null;
  const longest = Math.max(bitmap.width, bitmap.height);
  for (const side of SIDES) {
    if (side && side >= longest) continue;
    const canvas = draw(bitmap, side, type === "image/jpeg" ? "#ffffff" : undefined);
    // the lowest quality first: if even that doesn't fit, go smaller right away
    const floor = await canvasToBlob(canvas, type, 0.3);
    const floorFit: Fitted = { blob: floor, width: canvas.width, height: canvas.height, quality: 0.3, fits: floor.size <= targetBytes };
    if (!smallest || floor.size < smallest.blob.size) smallest = floorFit;
    if (!floorFit.fits) continue;
    let lo = 0.3, hi = 0.95, best = floorFit;
    for (let i = 0; i < 7; i++) {
      const q = (lo + hi) / 2;
      const blob = await canvasToBlob(canvas, type, q);
      if (blob.size <= targetBytes) (best = { blob, width: canvas.width, height: canvas.height, quality: q, fits: true }), (lo = q);
      else hi = q;
    }
    return best;
  }
  return smallest!;
}

/**
 * A lossy PNG: the image reduced to a palette of `colors` colours (with
 * transparency kept), the way TinyPNG-style tools work. 256 colours is
 * hard to tell apart from the original for logos, screenshots and graphics.
 */
export async function quantizedPng(canvas: HTMLCanvasElement, colors: number): Promise<Blob> {
  const { default: UPNG } = await import("upng-js");
  const ctx = canvas.getContext("2d")!;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const png = UPNG.encode([data.buffer as ArrayBuffer], canvas.width, canvas.height, colors);
  return new Blob([png], { type: "image/png" });
}
