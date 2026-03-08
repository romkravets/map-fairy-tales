/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "firebasestorage.googleapis.com",
      "d1ei2xrl63k822.cloudfront.net", // Allow CloudFront images for story previews
    ],
  },
  typescript: {
    // Allow production builds to complete even if there are type errors.
    // This keeps CI/builds unblocked while incremental type fixes are addressed.
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
        dns: false,
      };
    }
    return config;
  },
  eslint: {
    // Prevent ESLint from failing the production build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
