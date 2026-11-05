declare module "upng-js" {
  const UPNG: {
    encode(bufs: ArrayBuffer[], w: number, h: number, colors: number, dels?: number[], forbidPlte?: boolean): ArrayBuffer;
    decode(buf: ArrayBuffer): { width: number; height: number };
  };
  export default UPNG;
}
