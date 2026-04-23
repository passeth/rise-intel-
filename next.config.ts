import bundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'usvjbuudnofwhmclwhfl.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default withBundleAnalyzer(nextConfig)
