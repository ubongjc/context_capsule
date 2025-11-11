import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Set maximum request timeout to 30 seconds
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
