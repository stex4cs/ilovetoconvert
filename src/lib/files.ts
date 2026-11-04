import { zipSync } from "fflate";

export type Output = { name: string; blob: Blob };

/** Starts a download of a Blob under the given name. */
export function save(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Several outputs in one .zip (stored, not recompressed: PDFs and images are already compressed). */
export async function zip(outputs: Output[]): Promise<Blob> {
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  const used = new Set<string>();
  for (const o of outputs) {
    let name = o.name;
    for (let i = 2; used.has(name); i++) name = o.name.replace(/(\.[^.]+)?$/, `-${i}$1`);
    used.add(name);
    entries[name] = [new Uint8Array(await o.blob.arrayBuffer()), { level: 0 }];
  }
  return new Blob([zipSync(entries) as BlobPart], { type: "application/zip" });
}

export const readBytes = (file: File) => file.arrayBuffer();
