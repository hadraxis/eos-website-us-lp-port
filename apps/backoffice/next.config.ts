import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/proposal-engine', '@repo/database'],
  images: {
    remotePatterns: [],
  },
}

export default nextConfig
