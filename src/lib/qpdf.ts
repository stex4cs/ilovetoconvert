/**
 * qpdf (the reference PDF transformation tool) compiled to WebAssembly.
 * Used for what pdf-lib can't do: AES-256 encryption and decryption.
 * (This build has no C++ exception support, so qpdf's own damage recovery
 * doesn't run; repair goes through pdf-lib instead.) A fresh instance per run.
 */

type QpdfInstance = {
  callMain: (args: string[]) => number;
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
  };
};

export type QpdfResult = { out: Uint8Array | null; code: number; log: string };

export async function runQpdf(input: ArrayBuffer | Uint8Array, args: (inPath: string, outPath: string) => string[]): Promise<QpdfResult> {
  const [{ default: createModule }, { default: wasmUrl }] = await Promise.all([
    import("@neslinesli93/qpdf-wasm"),
    import("@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url"),
  ]);
  const create = createModule as unknown as (opts: Record<string, unknown>) => Promise<QpdfInstance>;

  // This build binds console.log/console.error when the module is created and
  // ignores print/printErr, so qpdf's messages ("invalid password") are caught
  // by swapping the console functions around creation and the run.
  let log = "";
  const original = { log: console.log, error: console.error };
  console.log = console.error = (...a: unknown[]) => void (log += a.join(" ") + "\n");
  let code = 0;
  let out: Uint8Array | null = null;
  try {
    const q = await create({ locateFile: () => wasmUrl, noInitialRun: true });
    q.FS.writeFile("/in.pdf", new Uint8Array(input));
    try {
      code = q.callMain(args("/in.pdf", "/out.pdf"));
    } catch (e) {
      // Emscripten signals exit() by throwing an ExitStatus with the code.
      code = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 2;
    }
    // qpdf exit codes: 0 ok, 3 ok with warnings (output written), 2 error.
    // This build's FS has no analyzePath, so a missing output shows up as a throw.
    if (code !== 2) {
      try {
        out = q.FS.readFile("/out.pdf");
      } catch {
        out = null;
      }
    }
  } finally {
    console.log = original.log;
    console.error = original.error;
  }
  return { out, code, log };
}

export const encrypt = (data: ArrayBuffer, password: string) =>
  runQpdf(data, (i, o) => ["--encrypt", password, password, "256", "--", i, o]);

export const decrypt = (data: ArrayBuffer, password: string) =>
  runQpdf(data, (i, o) => [`--password=${password}`, "--decrypt", i, o]);

/**
 * Whether the PDF is encrypted. The /Encrypt entry lives in the trailer or the
 * cross-reference stream dictionary, which are never encrypted themselves, so
 * it's visible in the raw bytes. (qpdf's --is-encrypted needs the password
 * for files that require one, so it can't be used before asking.)
 */
export function isEncrypted(data: ArrayBuffer): boolean {
  const bytes = new Uint8Array(data);
  const dec = new TextDecoder("latin1");
  const re = /\/Encrypt\s*(\d+\s+\d+\s+R|<<)/;
  return re.test(dec.decode(bytes.subarray(Math.max(0, bytes.length - 200_000)))) || re.test(dec.decode(bytes.subarray(0, 200_000)));
}
