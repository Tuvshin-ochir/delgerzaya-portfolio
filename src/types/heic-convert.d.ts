declare module 'heic-convert' {
  const convert: (opts: { buffer: ArrayBufferLike; format: 'JPEG' | 'PNG'; quality?: number }) => Promise<ArrayBuffer>;
  export default convert;
}
