import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['i.ebayimg.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ebayimg.com',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      }
    ],
  },
};

export default nextConfig;
