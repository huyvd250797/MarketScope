import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@ssi.developer/ssi-sdk'],
  poweredByHeader: false,
};

export default nextConfig;
