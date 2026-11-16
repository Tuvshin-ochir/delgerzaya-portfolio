import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  reactStrictMode: true,
  serverExternalPackages: ['sharp', 'heic-convert'],
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
};
export default nextConfig;
